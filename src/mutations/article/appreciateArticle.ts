import type { GQLMutationResolvers } from 'definitions'

import { invalidateFQC } from '@matters/apollo-response-cache'

import {
  ARTICLE_STATE,
  USER_STATE,
  APPRECIATION_TYPES,
  DB_NOTICE_TYPE,
  NODE_TYPES,
} from 'common/enums'
import { environment } from 'common/environment'
import {
  ActionLimitExceededError,
  ArticleNotFoundError,
  ForbiddenByStateError,
  ForbiddenByTargetStateError,
  ForbiddenError,
  UserInputError,
} from 'common/errors'
import { fromGlobalId } from 'common/utils'
import { LikeCoin } from 'connectors'

const resolver: GQLMutationResolvers['appreciateArticle'] = async (
  _,
  { input: { id, amount } },
  context
) => {
  const {
    viewer,
    dataSources: {
      atomService,
      userService,
      articleService,
      notificationService,
      connections,
    },
  } = context

  if (!viewer.userName) {
    throw new ForbiddenError('user has no username')
  }

  // check viewer
  if (
    [USER_STATE.archived, USER_STATE.banned, USER_STATE.frozen].includes(
      viewer.state
    )
  ) {
    throw new ForbiddenByStateError(`${viewer.state} user has no permission`)
  }

  // check amount
  if (!amount || amount <= 0) {
    throw new UserInputError('invalid amount')
  }

  // check target
  const { id: dbId } = fromGlobalId(id)
  const article = await atomService.findFirst({
    table: 'article',
    where: { id: dbId, state: ARTICLE_STATE.active },
  })
  if (!article) {
    throw new ArticleNotFoundError('target article does not exists')
  }

  // check author
  const author = await atomService.userIdLoader.load(article.authorId)
  if (author.state === USER_STATE.frozen) {
    throw new ForbiddenByTargetStateError(
      `cannot appreciate ${author.state} user`
    )
  }
  const sender = await atomService.userIdLoader.load(viewer.id)

  // check if viewer is blocked by article owner
  const isBlocked = await userService.blocked({
    userId: article.authorId,
    targetId: viewer.id,
  })
  if (isBlocked) {
    throw new ForbiddenError('viewer is blocked by target author')
  }

  const appreciateLeft = await articleService.appreciateLeftByUser({
    articleId: dbId,
    userId: viewer.id,
  })
  if (appreciateLeft <= 0) {
    throw new ActionLimitExceededError('too many appreciations')
  }

  // Check if amount exceeded limit. if yes, then use the left amount.
  const validAmount = Math.min(amount, appreciateLeft)

  // insert appreciation record
  await articleService.appreciate({
    articleId: article.id,
    senderId: viewer.id,
    recipientId: article.authorId,
    amount: validAmount,
    type: APPRECIATION_TYPES.like,
  })

  // insert record to LikeCoin
  const likecoin = new LikeCoin(connections)
  if (author.likerId && sender.likerId && author.likerId !== sender.likerId) {
    likecoin.like({
      likerId: sender.likerId,
      likerIp: viewer.ip,
      userAgent: viewer.userAgent,
      authorLikerId: author.likerId,
      url: `https://${environment.siteDomain}/a/${article.shortHash}`,
      amount: validAmount,
    })
  }

  // trigger notifications
  notificationService.trigger({
    event: DB_NOTICE_TYPE.article_new_appreciation,
    actorId: sender.id,
    recipientId: author.id,
    entities: [{ type: 'target', entityTable: 'article', entity: article }],
  })

  // invalidate cache
  invalidateFQC({
    node: { type: NODE_TYPES.Article, id: article.id },
    redis: connections.redis,
  })
  invalidateFQC({
    node: { type: NODE_TYPES.User, id: article.authorId },
    redis: connections.redis,
  })

  return article
}

export default resolver
