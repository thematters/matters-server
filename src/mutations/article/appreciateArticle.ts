import { Resolver } from 'definitions'
import { fromGlobalId } from 'common/utils'

const resolver: Resolver = async (
  root,
  { input: { id, amount } },
  { viewer, dataSources: { articleService, notificationService } }
) => {
  if (!viewer.id) {
    throw new Error('anonymous user cannot do this') // TODO
  }

  if (viewer.mat < amount) {
    throw new Error('not enough MAT to appreciate') // TODO
  }

  const { id: dbId } = fromGlobalId(id)
  const article = await articleService.dataloader.load(dbId)
  if (!article) {
    throw new Error('target article does not exists') // TODO
  }

  await articleService.appreciate(article.id, viewer.id, amount, viewer.mat)

  // trigger notifications
  notificationService.trigger({
    event: 'article_new_appreciation',
    actorId: viewer.id,
    recipientId: article.authorId,
    entities: [
      {
        type: 'target',
        entityTable: 'article',
        entity: article
      }
    ]
  })

  return articleService.dataloader.load(article.id)
}

export default resolver
