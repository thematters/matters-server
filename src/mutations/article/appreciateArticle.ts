// import slugify from '@matters/slugify'
import { v4 } from 'uuid'

import {
  APPRECIATION_PURPOSE,
  APPRECIATION_TYPES,
  ARTICLE_ACCESS_TYPE,
  ARTICLE_STATE,
  USER_STATE,
} from 'common/enums/index.js'
import { environment } from 'common/environment.js'
import {
  ActionLimitExceededError,
  ArticleNotFoundError,
  AuthenticationError,
  ForbiddenByStateError,
  ForbiddenByTargetStateError,
  ForbiddenError,
  UserInputError,
} from 'common/errors.js'
import { fromGlobalId } from 'common/utils/index.js'
import { gcp } from 'connectors/index.js'
import { appreciationQueue } from 'connectors/queue/index.js'
import { MutationToAppreciateArticleResolver } from 'definitions'

const resolver: MutationToAppreciateArticleResolver = async (
  root,
  { input: { id, amount, token, superLike } },
  {
    viewer,
    dataSources: {
      atomService,
      userService,
      articleService,
      draftService,
      paymentService,
      systemService,
    },
  }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  // check viewer
  if (
    [USER_STATE.archived, USER_STATE.banned, USER_STATE.frozen].includes(
      viewer.state
    )
  ) {
    throw new ForbiddenByStateError(`${viewer.state} user has no permission`)
  }

  if (!viewer.likerId) {
    throw new ForbiddenError('viewer has no liker id')
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
  const node = await draftService.baseFindById(article.draftId)
  if (!node) {
    throw new ArticleNotFoundError(
      'target article linked draft does not exists'
    )
  }

  // check author
  const isAuthor = article.authorId === viewer.id
  if (isAuthor && !superLike) {
    throw new ForbiddenError('cannot appreciate your own article')
  }

  const author = await userService.dataloader.load(article.authorId)
  if (!author) {
    throw new ForbiddenError('author has no liker id')
  }

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

  /**
   * Super Like
   */
  if (superLike) {
    const liker = await userService.findLiker({ userId: viewer.id })
    if (!liker || !author) {
      throw new ForbiddenError('viewer or author has no liker id')
    }

    // const slug = slugify(node.title)
    const superLikeData = {
      liker,
      iscn_id: article.iscn_id,
      url: `${environment.siteDomain}/@${author.userName}/${article.id}`,
      likerIp: viewer.ip,
      userAgent: viewer.userAgent,
    }
    const canSuperLike = await userService.likecoin.canSuperLike(superLikeData)

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

    return node
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
    const isHuman = await gcp.recaptcha({ token, ip: viewer.ip })
    if (!isHuman) {
      throw new ForbiddenError('appreciate via script is not allowed')
    }
  }

  // insert appreciation job
  appreciationQueue.appreciate({
    amount: validAmount,
    articleId: article.id,
    senderId: viewer.id,
    senderIP: viewer.ip,
    userAgent: viewer.userAgent,
  })

  return node
}

export default resolver
