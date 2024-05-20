import type { GQLMutationResolvers } from 'definitions'

import { ARTICLE_STATE, USER_STATE } from 'common/enums'
import {
  ActionLimitExceededError,
  ArticleNotFoundError,
  ForbiddenByStateError,
  ForbiddenByTargetStateError,
  ForbiddenError,
  UserInputError,
} from 'common/errors'
import { fromGlobalId } from 'common/utils'

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
      queues: { appreciationQueue },
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

  // insert appreciation job
  appreciationQueue.appreciate({
    amount: validAmount,
    articleId: article.id,
    senderId: viewer.id,
    senderIP: viewer.ip,
    userAgent: viewer.userAgent,
  })

  return article
}

export default resolver
