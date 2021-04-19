import _ from 'lodash'
import { v4 } from 'uuid'

import {
  ARTICLE_ACCESS_TYPE,
  CACHE_KEYWORD,
  CIRCLE_ACTION,
  CIRCLE_STATE,
  COMMENT_TYPE,
  DB_NOTICE_TYPE,
  NODE_TYPES,
  PRICE_STATE,
  SUBSCRIPTION_STATE,
  USER_STATE,
} from 'common/enums'
import {
  ArticleNotFoundError,
  AuthenticationError,
  CircleNotFoundError,
  CommentNotFoundError,
  ForbiddenByStateError,
  ForbiddenError,
  UserInputError,
} from 'common/errors'
import { fromGlobalId, isArticleLimitedFree, sanitize } from 'common/utils'
import { GQLCommentType, MutationToPutCommentResolver } from 'definitions'

const resolver: MutationToPutCommentResolver = async (
  root,
  {
    input: {
      comment: {
        content,
        parentId,
        mentions,
        replyTo,
        type,
        articleId,
        circleId,
      },
      id,
    },
  },
  {
    viewer,
    dataSources: {
      atomService,
      paymentService,
      commentService,
      articleService,
      notificationService,
      userService,
    },
    knex,
  }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  if (!content || content.length <= 0) {
    throw new UserInputError(
      `"content" is required and must be at least 1 character`
    )
  }

  const data: { [key: string]: any } = {
    content: sanitize(content),
    authorId: viewer.id,
  }

  /**
   * check target
   */
  let article: any
  let circle: any
  let targetAuthor: any
  if (articleId) {
    const { id: articleDbId } = fromGlobalId(articleId)
    article = await articleService.dataloader.load(articleDbId)

    if (!article) {
      throw new ArticleNotFoundError('target article does not exists')
    }

    const { id: typeId } = await atomService.findFirst({
      table: 'entity_type',
      where: { table: 'article' },
    })
    data.targetTypeId = typeId
    data.targetId = article.id

    targetAuthor = article.authorId
  } else if (circleId) {
    const { id: circleDbId } = fromGlobalId(circleId)
    circle = await atomService.circleIdLoader.load(circleDbId)

    if (!circle) {
      throw new CircleNotFoundError('target circle does not exists')
    }

    const { id: typeId } = await atomService.findFirst({
      table: 'entity_type',
      where: { table: 'circle' },
    })
    data.targetTypeId = typeId
    data.targetId = circle.id

    targetAuthor = circle.owner
  } else {
    throw new UserInputError('`articleId` or `circleId` is required')
  }

  /**
   * check comment type
   */
  const isArticleType = type === GQLCommentType.article
  const isCircleDiscussion = type === GQLCommentType.circleDiscussion
  const isCircleBroadcast = type === GQLCommentType.circleBroadcast
  if (isArticleType && !article) {
    throw new UserInputError('`articleId` is required if `type` is `article`')
  } else if ((isCircleDiscussion || isCircleBroadcast) && !circle) {
    throw new UserInputError(
      '`circleId` is required if `type` is `circleBroadcast` or `circleDiscussion`'
    )
  } else {
    data.type = {
      [GQLCommentType.article]: COMMENT_TYPE.article,
      [GQLCommentType.circleBroadcast]: COMMENT_TYPE.circleBroadcast,
      [GQLCommentType.circleDiscussion]: COMMENT_TYPE.circleDiscussion,
    }[type]
  }

  /**
   * check parentComment
   */
  let parentComment: any
  if (parentId) {
    const { id: parentDbId } = fromGlobalId(parentId)
    parentComment = await commentService.dataloader.load(parentDbId)
    if (!parentComment) {
      throw new CommentNotFoundError('target parentComment does not exists')
    }
    data.parentCommentId = parentComment.id
  }

  /**
   * check reply to
   */
  let replyToComment: any
  if (replyTo) {
    const { id: replyToDBId } = fromGlobalId(replyTo)
    replyToComment = await commentService.dataloader.load(replyToDBId)
    if (!replyToComment) {
      throw new CommentNotFoundError('target replyToComment does not exists')
    }
    data.replyTo = replyToDBId
  }

  /**
   * check permission
   */
  const isTargetAuthor = targetAuthor === viewer.id
  const isOnboarding = viewer.state === USER_STATE.onboarding
  const isInactive = [
    USER_STATE.banned,
    USER_STATE.archived,
    USER_STATE.frozen,
  ].includes(viewer.state)

  if ((isOnboarding && !isTargetAuthor) || isInactive) {
    throw new ForbiddenByStateError(`${viewer.state} user has no permission`)
  }

  // only allow the owner and members to comment on circle
  if (circle && !isTargetAuthor) {
    const isCircleMember = await paymentService.isCircleMember({
      userId: viewer.id,
      circleId: circle.id,
    })
    const isReplyToBroadcast =
      replyToComment?.type === COMMENT_TYPE.circleBroadcast

    if (!isCircleMember || (isCircleBroadcast && !isReplyToBroadcast)) {
      throw new ForbiddenError('only circle members have the permission')
    }
  }

  // only allow the author, members,
  // or within free limited period to comment on article
  if (article && !isTargetAuthor) {
    const articleCircle = await knex
      .select('article_circle.*')
      .from('article_circle')
      .join('circle', 'article_circle.circle_id', 'circle.id')
      .where({
        'article_circle.article_id': article.id,
        'circle.state': CIRCLE_STATE.active,
      })
      .first()

    if (articleCircle) {
      const isCircleMember = await paymentService.isCircleMember({
        userId: viewer.id,
        circleId: articleCircle.circleId,
      })
      const isPublic = articleCircle.access === ARTICLE_ACCESS_TYPE.public
      const isPaywalled = articleCircle.access === ARTICLE_ACCESS_TYPE.paywall
      const isLimitedFree =
        isPaywalled && isArticleLimitedFree(articleCircle.createdAt)

      if (!isCircleMember && !isLimitedFree && !isPublic) {
        throw new ForbiddenError('only circle members have the permission')
      }
    }
  }

  // check whether viewer is blocked by target author
  const isBlocked = await userService.blocked({
    userId: targetAuthor,
    targetId: viewer.id,
  })
  if (isBlocked) {
    throw new ForbiddenError('viewer is blocked by target author')
  }

  /**
   * check mentions
   */
  if (mentions) {
    data.mentionedUserIds = mentions.map(
      (userId: string) => fromGlobalId(userId).id
    )
  }

  /**
   * Update
   */
  let newComment: any
  if (id) {
    const { id: commentDbId } = fromGlobalId(id)

    // check permission
    const comment = await commentService.dataloader.load(commentDbId)
    if (comment.authorId !== viewer.id) {
      throw new ForbiddenError('viewer has no permission')
    }

    newComment = await atomService.update({
      table: 'comment',
      where: { id: commentDbId },
      data: {
        content: data.content,
        authorId: data.authorId,
        parentCommentId: data.parentCommentId,
        replyTo: data.replyTo,
        updatedAt: new Date(),
      },
    })
  } else {
    /**
     * Create
     */
    newComment = await atomService.create({
      table: 'comment',
      data: {
        uuid: v4(),
        content: data.content,
        authorId: data.authorId,
        targetId: data.targetId,
        targetTypeId: data.targetTypeId,
        parentCommentId: data.parentCommentId,
        replyTo: data.replyTo,
        type: data.type,
      },
    })

    /**
     * Notifications
     */
    const parentCommentAuthor = _.get(parentComment, 'authorId')
    const parentCommentId = _.get(parentComment, 'id')
    const replyToCommentAuthor = _.get(replyToComment, 'authorId')
    const replyToCommentId = _.get(replyToComment, 'id')

    const isLevel1Comment = !parentComment && !replyToComment
    const isReplyLevel1Comment =
      !isLevel1Comment && parentCommentId === replyToCommentId
    const isReplyingLevel2Comment =
      !isLevel1Comment && parentCommentId !== replyToCommentId

    // notify article's author
    const shouldNotifyArticleAuthor =
      article &&
      (isLevel1Comment ||
        (targetAuthor !== parentCommentAuthor &&
          targetAuthor !== replyToCommentAuthor))

    if (shouldNotifyArticleAuthor) {
      notificationService.trigger({
        event: DB_NOTICE_TYPE.article_new_comment,
        actorId: viewer.id,
        recipientId: targetAuthor,
        entities: [
          {
            type: 'target',
            entityTable: 'article',
            entity: article,
          },
          {
            type: 'comment',
            entityTable: 'comment',
            entity: newComment,
          },
        ],
      })
    }

    // notify parentComment's author
    const replyEvent = isCircleBroadcast
      ? DB_NOTICE_TYPE.circle_broadcast_new_reply
      : isCircleDiscussion
      ? DB_NOTICE_TYPE.circle_discussion_new_reply
      : DB_NOTICE_TYPE.comment_new_reply
    const shouldNotifyParentCommentAuthor =
      isReplyLevel1Comment || parentCommentAuthor !== replyToCommentAuthor
    if (shouldNotifyParentCommentAuthor) {
      notificationService.trigger({
        event: replyEvent,
        actorId: viewer.id,
        recipientId: parentCommentAuthor,
        entities: [
          {
            type: 'target',
            entityTable: 'comment',
            entity: parentComment,
          },
          {
            type: 'reply',
            entityTable: 'comment',
            entity: newComment,
          },
        ],
      })
    }

    // notify replyToComment's author
    const shouldNotifyReplyToCommentAuthor = isReplyingLevel2Comment
    if (shouldNotifyReplyToCommentAuthor) {
      notificationService.trigger({
        event: replyEvent,
        actorId: viewer.id,
        recipientId: replyToCommentAuthor,
        entities: [
          {
            type: 'target',
            entityTable: 'comment',
            entity: replyToComment,
          },
          {
            type: 'reply',
            entityTable: 'comment',
            entity: newComment,
          },
        ],
      })
    }

    // notify article's subscribers
    if (article) {
      const articleSubscribers = await articleService.findSubscriptions({
        id: article.id,
      })
      articleSubscribers.forEach((subscriber: any) => {
        notificationService.trigger({
          event: DB_NOTICE_TYPE.subscribed_article_new_comment,
          actorId: viewer.id,
          recipientId: subscriber.id,
          entities: [
            {
              type: 'target',
              entityTable: 'article',
              entity: article,
            },
            {
              type: 'comment',
              entityTable: 'comment',
              entity: newComment,
            },
          ],
        })
      })
    }

    // notify cirlce members and followers
    if (circle && isCircleBroadcast && isLevel1Comment) {
      // retrieve circle members and followers
      const members = await knex
        .from('circle_subscription_item as csi')
        .join('circle_price', 'circle_price.id', 'csi.price_id')
        .join('circle_subscription as cs', 'cs.id', 'csi.subscription_id')
        .where({
          'circle_price.circle_id': circle.id,
          'circle_price.state': PRICE_STATE.active,
          'csi.archived': false,
        })
        .whereIn('cs.state', [
          SUBSCRIPTION_STATE.active,
          SUBSCRIPTION_STATE.trialing,
        ])

      const followers = await atomService.findMany({
        table: 'action_circle',
        select: ['user_id'],
        where: { targetId: circle.id, action: CIRCLE_ACTION.follow },
      })
      const recipients = _.uniq([
        ...members.map((m) => m.userId),
        ...followers.map((f) => f.userId),
      ])

      recipients.forEach((recipientId) => {
        notificationService.trigger({
          event: DB_NOTICE_TYPE.circle_new_broadcast,
          actorId: viewer.id,
          recipientId,
          entities: [
            {
              type: 'target',
              entityTable: 'comment',
              entity: newComment,
            },
          ],
        })
      })
    }
  }

  // notify mentioned users
  if (data.mentionedUserIds) {
    const mentionedEvent = isCircleBroadcast
      ? DB_NOTICE_TYPE.circle_broadcast_mentioned_you
      : isCircleDiscussion
      ? DB_NOTICE_TYPE.circle_discussion_mentioned_you
      : DB_NOTICE_TYPE.comment_mentioned_you
    data.mentionedUserIds.forEach((userId: string) => {
      notificationService.trigger({
        event: mentionedEvent,
        actorId: viewer.id,
        recipientId: userId,
        entities: [
          {
            type: 'target',
            entityTable: 'comment',
            entity: newComment,
          },
        ],
      })
    })
  }

  // invalidate extra nodes
  newComment[CACHE_KEYWORD] = [
    parentComment ? { id: parentComment.id, type: NODE_TYPES.comment } : {},
    replyToComment ? { id: replyToComment.id, type: NODE_TYPES.comment } : {},
    {
      id: article ? article.id : circle.id,
      type: article ? NODE_TYPES.article : NODE_TYPES.circle,
    },
  ]

  return newComment
}

export default resolver
