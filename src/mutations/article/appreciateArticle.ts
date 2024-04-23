// import slugify from '@matters/slugify'
import type { GQLMutationResolvers } from 'definitions'

import { v4 } from 'uuid'

import {
  APPRECIATION_PURPOSE,
  APPRECIATION_TYPES,
  ARTICLE_ACCESS_TYPE,
  ARTICLE_STATE,
  USER_STATE,
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
import { fromGlobalId, verifyCaptchaToken } from 'common/utils'
// import { GCP, cfsvc } from 'connectors'

const resolver: GQLMutationResolvers['appreciateArticle'] = async (
  _,
  { input: { id, amount, token, superLike } },
  context
) => {
  const {
    viewer,
    dataSources: {
      atomService,
      userService,
      articleService,
      paymentService,
      systemService,
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
  const isAuthor = article.authorId === viewer.id
  if (isAuthor && !superLike) {
    throw new ForbiddenError('cannot appreciate your own article')
  }

  const author = await atomService.userIdLoader.load(article.authorId)

  if (author.state === USER_STATE.frozen) {
    throw new ForbiddenByTargetStateError(
      `cannot appreciate ${author.state} user`
    )
  }

  // check access
  const articleCircle = await articleService.findArticleCircle(article.id)

  if (articleCircle && !isAuthor) {
    const isCircleMember = await paymentService.isCircleMember({
      userId: viewer.id,
      circleId: articleCircle.circleId,
    })
    const isPaywall = articleCircle.access === ARTICLE_ACCESS_TYPE.paywall

    if (isPaywall && !isCircleMember) {
      throw new ForbiddenError('only circle members have the permission')
    }
  }

  // check if viewer is blocked by article owner
  const isBlocked = await userService.blocked({
    userId: article.authorId,
    targetId: viewer.id,
  })
  if (isBlocked) {
    throw new ForbiddenError('viewer is blocked by target author')
  }

  const articleVersion = await articleService.loadLatestArticleVersion(
    article.id
  )
  /**
   * Super Like
   */
  if (superLike) {
    const liker = await userService.findLiker({ userId: viewer.id })

    if (liker?.likerId && author.likerId) {
      // const slug = slugify(node.title)
      const superLikeData = {
        liker,
        iscn_id: articleVersion.iscnId,
        url: `https://${environment.siteDomain}/@${author.userName}/${article.id}`,
        likerIp: viewer.ip,
        userAgent: viewer.userAgent,
      }
      const canSuperLike = await userService.likecoin.canSuperLike(
        superLikeData
      )

      if (!canSuperLike) {
        throw new ForbiddenError('cannot super like')
      }

      await userService.likecoin.superlike({
        ...superLikeData,
        authorLikerId: author.likerId,
      })

      // insert record
      const appreciation = {
        senderId: viewer.id,
        recipientId: article.authorId,
        referenceId: article.id,
        purpose: APPRECIATION_PURPOSE.superlike,
        type: APPRECIATION_TYPES.like,
      }
      await atomService.create({
        table: 'appreciation',
        data: { ...appreciation, uuid: v4(), amount },
      })

      return article
    }
  }

  /**
   * Like
   */
  const appreciateLeft = await articleService.appreciateLeftByUser({
    articleId: dbId,
    userId: viewer.id,
  })
  if (appreciateLeft <= 0) {
    throw new ActionLimitExceededError('too many appreciations')
  }

  // Check if amount exceeded limit. if yes, then use the left amount.
  const validAmount = Math.min(amount, appreciateLeft)

  // protect from scripting
  const feature = await systemService.getFeatureFlag('verify_appreciate')

  if (feature && (await systemService.isFeatureEnabled(feature.flag, viewer))) {
    // for a transition period, we may check both, and pass if any one pass siteverify
    // after the transition period, can turn off the one no longer in use
    const isHuman = await verifyCaptchaToken(token!, viewer.ip)
    if (!isHuman) {
      throw new ForbiddenError('appreciate via script is not allowed')
    }
  }

  // insert appreciation job
  appreciationQueue.appreciate(
    {
      amount: validAmount,
      articleId: article.id,
      senderId: viewer.id,
      senderIP: viewer.ip,
      userAgent: viewer.userAgent,
    },
    context
  )

  return article
}

export default resolver
