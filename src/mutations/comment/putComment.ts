import _ from 'lodash'
import { v4 } from 'uuid'

import {
  ARTICLE_ACCESS_TYPE,
  ARTICLE_STATE,
  CACHE_KEYWORD,
  // CIRCLE_ACTION,
  COMMENT_TYPE,
  DB_NOTICE_TYPE,
  NODE_TYPES,
  // PRICE_STATE,
  // SUBSCRIPTION_STATE,
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
import { fromGlobalId, sanitize } from 'common/utils'
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
    article = await atomService.findFirst({
      table: 'article',
      where: { id: articleDbId, state: ARTICLE_STATE.active },
    })
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

    // check if the author of parent comment blocked viewer
    const isParentBlocked = await userService.blocked({
      userId: parentComment.authorId,
      targetId: viewer.id,
    })
    if (isParentBlocked) {
      throw new ForbiddenError('viewer is blocked by parent author')
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

  if ((article && isOnboarding && !isTargetAuthor) || isInactive) {
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
    const articleCircle = await articleService.findArticleCircle(article.id)

    if (articleCircle) {
      const isCircleMember = await paymentService.isCircleMember({
        userId: viewer.id,
        circleId: articleCircle.circleId,
      })
      const isPublic = articleCircle.access === ARTICLE_ACCESS_TYPE.public

      if (!isCircleMember && !isPublic) {
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

    // check if mentioned user blocked viewer
    const anyBlocked = _.some(
      await Promise.all(
        data.mentionedUserIds.map((mentionUserId: string) =>
          userService.blocked({
            userId: mentionUserId,
            targetId: viewer.id,
          })
        )
      )
    )
    if (anyBlocked) {
      throw new ForbiddenError('mentioned user blocked viewer')
    }
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
        updatedAt: knex.fn.now(), // new Date(),
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
    if (isArticleType && shouldNotifyParentCommentAuthor) {
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

    // notify cirlce owner & members & followers
    if (
      circle &&
      // isLevel1Comment &&
      (isCircleBroadcast || isCircleDiscussion)
    ) {
      const recipients = await userService.findCircleRecipients(circle.id)

      if (isCircleBroadcast) {
        recipients.forEach((recipientId: any) => {
          notificationService.trigger({
            event: DB_NOTICE_TYPE.in_circle_new_broadcast, // circle_new_broadcast,
            actorId: viewer.id,
            recipientId,
            entities: [
              {
                type: 'target',
                entityTable: 'circle',
                entity: circle,
              },
              { type: 'comment', entityTable: 'comment', entity: newComment },
              // {type: 'target', entityTable: 'comment', entity: newComment,},
            ],
          })
        })

        if (!isLevel1Comment) {
          notificationService.trigger({
            event: DB_NOTICE_TYPE.circle_member_new_broadcast_reply,
            actorId: viewer.id,
            recipientId: circle.owner,
            entities: [
              {
                type: 'target',
                entityTable: 'circle',
                entity: circle,
              },
            ],
          })
        }

        // for in circle events
        if (!isLevel1Comment) {
          recipients.forEach((recipientId: any) => {
            notificationService.trigger({
              event: DB_NOTICE_TYPE.in_circle_new_broadcast_reply,
              actorId: viewer.id,
              recipientId,
              entities: [
                {
                  type: 'target',
                  entityTable: 'circle',
                  entity: circle,
                },
                // {type: 'comment', entityTable: 'comment', entity: newComment,},
              ],
            })
          })
        } else {
          recipients.forEach((recipientId: any) => {
            notificationService.trigger({
              event: DB_NOTICE_TYPE.in_circle_new_broadcast,
              actorId: viewer.id,
              recipientId,
              entities: [
                {
                  type: 'target',
                  entityTable: 'circle',
                  entity: circle,
                },
                { type: 'comment', entityTable: 'comment', entity: newComment },
              ],
            })
          })
        }
      }

      if (isCircleDiscussion) {
        if (viewer.id !== circle.owner) {
          notificationService.trigger({
            event: !isLevel1Comment // replyToComment?.type === COMMENT_TYPE.circleDiscussion
              ? DB_NOTICE_TYPE.circle_member_new_discussion_reply
              : DB_NOTICE_TYPE.circle_member_new_discussion,
            actorId: viewer.id,
            recipientId: circle.owner,
            entities: [
              {
                type: 'target',
                entityTable: 'circle',
                entity: circle,
              },
              // {type: 'comment', entityTable: 'comment', entity: newComment,},
            ],
          })
        }

        recipients.forEach((recipientId: any) => {
          notificationService.trigger({
            event: DB_NOTICE_TYPE.circle_new_discussion,
            actorId: viewer.id,
            recipientId,
            entities: [
              {
                type: 'target',
                entityTable: 'circle',
                entity: circle,
              },
            ],
          })
        })

        // for in circle events
        const eventInCircle =
          replyToComment?.type === COMMENT_TYPE.circleDiscussion
            ? DB_NOTICE_TYPE.in_circle_new_discussion_reply
            : DB_NOTICE_TYPE.in_circle_new_discussion
        recipients.forEach((recipientId: any) => {
          notificationService.trigger({
            event: eventInCircle,
            actorId: viewer.id,
            recipientId,
            entities: [
              {
                type: 'target',
                entityTable: 'circle',
                entity: circle,
              },
            ],
          })
        })
      }
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
    parentComment ? { id: parentComment.id, type: NODE_TYPES.Comment } : {},
    replyToComment ? { id: replyToComment.id, type: NODE_TYPES.Comment } : {},
    {
      id: article ? article.id : circle.id,
      type: article ? NODE_TYPES.Article : NODE_TYPES.Circle,
    },
  ]

  return newComment
}

export default resolver
