import { AuthenticationError, ForbiddenError } from 'apollo-server'
import { MutationToAppreciateArticleResolver } from 'definitions'
import { v4 } from 'uuid'
import { fromGlobalId } from 'common/utils'

const resolver: MutationToAppreciateArticleResolver = async (
  root,
  { input: { id, amount } },
  { viewer, dataSources: { articleService, notificationService } }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  if (viewer.mat < amount) {
    throw new ForbiddenError('not enough MAT to appreciate')
  }

  const { id: dbId } = fromGlobalId(id)
  const article = await articleService.dataloader.load(dbId)
  if (!article) {
    throw new ForbiddenError('target article does not exists')
  }

  const appreciateLeft = await articleService.appreciateLeftByUser({
    articleId: dbId,
    userId: viewer.id
  })
  if (appreciateLeft <= 0) {
    throw new ForbiddenError('too many appreciations')
  }

  await articleService.appreciate({
    uuid: v4(),
    articleId: article.id,
    senderId: viewer.id,
    senderMAT: viewer.mat,
    recipientId: article.authorId,
    amount
  })

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
