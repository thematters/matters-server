import { Resolver } from 'definitions'
import { fromGlobalId } from 'common/utils'

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
  const {
    authorId,
    upstreamId,
    title,
    cover,
    summary,
    content,
    tags: tagList
  } = await draftService.dataloader.load(draftDBId)

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

  // TODO: timeout with task queue
  await articleService.publish(article.id)

  // handle tags
  let tags = tagList
  if (tags) {
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
    recipientId: authorId,
    entities: [
      {
        type: 'target',
        entityTable: 'article',
        entity: article
      }
    ]
  })
  if (upstreamId) {
    const upstream = await articleService.baseFindById(upstreamId)
    notificationService.trigger({
      event: 'article_new_downstream',
      actorId: authorId,
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

  return article
}

export default resolver
