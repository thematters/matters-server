import { v4 } from 'uuid'

import { CACHE_KEYWORD, NODE_TYPES, TRANSACTION_TYPES } from 'common/enums'
import { environment } from 'common/environment'
import {
  ActionLimitExceededError,
  ArticleNotFoundError,
  AuthenticationError,
  ForbiddenError,
  LikerNotFoundError,
  NotEnoughMatError
} from 'common/errors'
import { fromGlobalId } from 'common/utils'
import { MutationToAppreciateArticleResolver } from 'definitions'

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
    articleId: article.id,
    senderId: viewer.id,
    recipientId: article.authorId,
    amount,
    type: viewer.likerId ? TRANSACTION_TYPES.like : TRANSACTION_TYPES.mat
  })

  // publish a PubSub event
  notificationService.pubsub.publish(id, article)

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

  const newArticle = await articleService.dataloader.load(article.id)

  // Add custom data for cache invalidation
  newArticle[CACHE_KEYWORD] = [
    {
      id: newArticle.id,
      type: NODE_TYPES.article
    },
    {
      id: newArticle.authorId,
      type: NODE_TYPES.user
    }
  ]

  return newArticle
}

export default resolver
