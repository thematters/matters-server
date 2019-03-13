import {
  AuthenticationError,
  NotEnoughMatError,
  ArticleNotFoundError,
  ActionLimitExceededError,
  ForbiddenError
} from 'common/errors'
import { MutationToAppreciateArticleResolver } from 'definitions'
import { v4 } from 'uuid'
import { fromGlobalId } from 'common/utils'

const resolver: MutationToAppreciateArticleResolver = async (
  root,
  { input: { id, amount } },
  { viewer, dataSources: { userService, articleService, notificationService } }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  const viewerTotalMAT = await userService.totalMAT(viewer.id)
  if (viewerTotalMAT < amount) {
    throw new NotEnoughMatError('not enough MAT to appreciate')
  }

  const { id: dbId } = fromGlobalId(id)
  const article = await articleService.dataloader.load(dbId)
  if (!article) {
    throw new ArticleNotFoundError('target article does not exists')
  }

  if (article.author_id === viewer.id) {
    throw new ForbiddenError('cannot appreciate your own article')
  }

  const appreciateLeft = await articleService.appreciateLeftByUser({
    articleId: dbId,
    userId: viewer.id
  })
  if (appreciateLeft <= 0) {
    throw new ActionLimitExceededError('too many appreciations')
  }

  await articleService.appreciate({
    uuid: v4(),
    articleId: article.id,
    senderId: viewer.id,
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
