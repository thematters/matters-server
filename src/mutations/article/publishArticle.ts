import Queue from 'bull'

import { Resolver } from 'definitions'
import { fromGlobalId } from 'common/utils'
import { queueSharedOpts } from 'connectors/queue/utils'

const resolver: Resolver = async (
  root,
  { input: { id } },
  {
    viewer,
    dataSources: {
      articleService,
      draftService,
      tagService,
      notificationService
    }
  }
) => {
  if (!viewer.id) {
    throw new Error('anonymous user cannot do this') // TODO
  }

  // retrive data from draft
  const { id: draftDBId } = fromGlobalId(id)
  const draft = await draftService.dataloader.load(draftDBId)
  const { authorId, upstreamId, title, cover, summary, content } = draft
  if (authorId !== viewer.id) {
    throw new Error('draft does not exists') // TODO
  }

  // creat pending article
  const article = await articleService.create({
    authorId,
    draftId: draftDBId,
    upstreamId,
    title,
    cover,
    summary,
    content
  })
  console.log('logged')
  // create queue per publication
  const publishQueue = new Queue(`publish_${article.id}`)

  // add job to queue
  await publishQueue.add(
    {
      article,
      draft
    },
    { ...queueSharedOpts, delay: 1000 }
  )

  publishQueue.process(async (job, done) => {
    try {
      const { draft, article: articlePending } = job.data

      const article = await articleService.publish(articlePending.id)
      await draftService.baseUpdateById(draft.id, { archived: true })

      // handle tags
      let tags = draft.tag
      if (tags && tags.length > 0) {
        // create tag records, return tag record if already exists
        const dbTags = ((await Promise.all(
          tags.map((tag: string) => tagService.create({ content: tag }))
        )) as unknown) as [{ id: string; content: string }]
        // create article_tag record
        await tagService.createArticleTags({
          articleId: article.id,
          tagIds: dbTags.map(({ id }) => id)
        })
      } else {
        tags = []
      }

      // add to search
      articleService.addToSearch({ ...article, tags })
      // trigger notifications
      notificationService.trigger({
        event: 'article_published',
        recipientId: article.authorId,
        entities: [
          {
            type: 'target',
            entityTable: 'article',
            entity: article
          }
        ]
      })
      if (article.upstreamId) {
        const upstream = await articleService.baseFindById(upstreamId)
        notificationService.trigger({
          event: 'article_new_downstream',
          actorId: article.authorId,
          recipientId: upstream.authorId,
          entities: [
            {
              type: 'target',
              entityTable: 'article',
              entity: upstream
            },
            {
              type: 'downstream',
              entityTable: 'article',
              entity: article
            }
          ]
        })
      }

      done()
    } catch (err) {
      throw err
    }
  })

  return article
}

export default resolver
