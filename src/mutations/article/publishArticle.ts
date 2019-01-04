import Queue from 'bull'

import { Resolver } from 'definitions'
import { fromGlobalId } from 'common/utils'
import { PUBLISH_STATE } from 'common/enums'
import { queueSharedOpts } from 'connectors/queue/utils'

const resolver: Resolver = async (
  root,
  { input: { id, delay } },
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
  // const { authorId, upstreamId, title, cover, summary, content, tags } = draft
  if (draft.authorId !== viewer.id || draft.archived) {
    throw new Error('draft does not exists') // TODO
  }

  // create queue per publication and start pending state
  const publishQueue = new Queue(`publish_${draftDBId}`, queueSharedOpts)
  const draftPending = await draftService.baseUpdateById(draft.id, {
    archived: true,
    publishState: PUBLISH_STATE.pending
  })

  // add job to queue
  await publishQueue.add(
    {
      draftId: draftDBId
    },
    { delay: delay || 1000 * 60 * 2 + 2000 } // wait for 2 minutes + 2 sec buffer
  )

  publishQueue.process(async (job, done) => {
    const { draftId } = job.data
    const draft = await draftService.baseFindById(draftId)
    if (draft.publishState === PUBLISH_STATE.recalled) {
      console.log('Publication has been recalled, aborting.')
      done()
      return
    }
    try {
      // publish
      const article = await articleService.publish({
        ...draft,
        draftId: draft.id
      })
      // mark draft as published
      await draftService.baseUpdateById(draft.id, {
        archived: true,
        publishState: PUBLISH_STATE.published
      })

      // handle tags
      let tags = draft.tags
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
      await articleService.addToSearch({ ...article, tags })
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
        const upstream = await articleService.baseFindById(article.upstreamId)
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

  return draftPending
}

export default resolver
