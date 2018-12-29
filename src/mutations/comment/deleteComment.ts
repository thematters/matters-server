import { Resolver } from 'definitions'
import { fromGlobalId, toGlobalId } from 'common/utils'

const resolver: Resolver = async (
  _,
  { input: { id } },
  {
    viewer,
    dataSources: { commentService, articleService, notificationService }
  }
) => {
  if (!viewer) {
    throw new Error('anonymous user cannot do this') // TODO
  }

  const { id: dbId } = fromGlobalId(id)
  const { authorId, articleId } = await commentService.dataloader.load(dbId)

  if (authorId !== viewer.id) {
    throw new Error('viewer has no permission to do this') // TODO
  }

  await commentService.baseUpdateById(dbId, {
    status: 'archived'
  })

  // trigger notificaiton
  const article = await articleService.dataloader.load(articleId)
  notificationService.trigger({
    event: 'article_updated',
    entities: [
      {
        type: 'target',
        entityTable: 'article',
        entity: article
      }
    ]
  })

  return true
}
export default resolver
