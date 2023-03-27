import {
  normalizeCommentHTML,
  sanitizeHTML,
} from '@matters/matters-editor/transformers'
import _ from 'lodash'
import { v4 } from 'uuid'

import {
  ARTICLE_ACCESS_TYPE,
  ARTICLE_STATE,
  BUNDLED_NOTICE_TYPE,
  CACHE_KEYWORD,
  COMMENT_TYPE,
  DB_NOTICE_TYPE,
  NODE_TYPES,
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
import { fromGlobalId } from 'common/utils'
import {
  GQLCommentType,
  MutationToPutCommentResolver,
  NoticeCircleNewBroadcastCommentsParams,
  NoticeCircleNewDiscussionCommentsParams,
} from 'definitions'

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
      systemService,
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
    content: normalizeCommentHTML(await sanitizeHTML(content)),
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

  const parentCommentAuthor = _.get(parentComment, 'authorId')
  const parentCommentId = _.get(parentComment, 'id')
  const replyToCommentAuthor = _.get(replyToComment, 'authorId')
  const replyToCommentId = _.get(replyToComment, 'id')

  const isLevel1Comment = !parentComment && !replyToComment
  const isReplyLevel1Comment =
    !isLevel1Comment && parentCommentId === replyToCommentId
  const isReplyingLevel2Comment =
    !isLevel1Comment && parentCommentId !== replyToCommentId

  // cache and merge bundleable notices, then trigger them all at once
  const bundledNotices: {
    [key: string]:
      | NoticeCircleNewBroadcastCommentsParams
      | NoticeCircleNewDiscussionCommentsParams
  } = {}
  const cacheBundledNotices = (
    noticeType: DB_NOTICE_TYPE,
    notice:
      | NoticeCircleNewBroadcastCommentsParams
      | NoticeCircleNewDiscussionCommentsParams
  ) => {
    const key = `${noticeType}:${notice.actorId}:${notice.recipientId}`
    if (bundledNotices[key]) {
      bundledNotices[key] = {
        ...bundledNotices[key],
        data: {
          ...bundledNotices[key].data,
          ...notice.data,
        },
      }
    } else {
      bundledNotices[key] = notice
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
    // article: notify article's author
    const shouldNotifyArticleAuthor =
      article &&
      (isLevel1Comment ||
        (targetAuthor !== parentCommentAuthor &&
          targetAuthor !== replyToCommentAuthor))

    if (isArticleType && shouldNotifyArticleAuthor) {
      const isMentioned = !!data.mentionedUserIds?.includes(targetAuthor)

      if (!isMentioned) {
        notificationService.trigger({
          event: DB_NOTICE_TYPE.article_new_comment,
          actorId: viewer.id,
          recipientId: targetAuthor,
          entities: [
            { type: 'target', entityTable: 'article', entity: article },
            { type: 'comment', entityTable: 'comment', entity: newComment },
          ],
        })
      }
    }

    // article: notify parentComment's author
    const shouldNotifyParentCommentAuthor =
      isReplyLevel1Comment || parentCommentAuthor !== replyToCommentAuthor
    if (isArticleType && shouldNotifyParentCommentAuthor) {
      const isMentioned = !!data.mentionedUserIds?.includes(parentCommentAuthor)

      if (!isMentioned) {
        notificationService.trigger({
          event: DB_NOTICE_TYPE.comment_new_reply,
          actorId: viewer.id,
          recipientId: parentCommentAuthor,
          entities: [
            { type: 'target', entityTable: 'comment', entity: parentComment },
            { type: 'reply', entityTable: 'comment', entity: newComment },
          ],
        })
      }
    }

    // article: notify replyToComment's author
    const shouldNotifyReplyToCommentAuthor = isReplyingLevel2Comment
    if (isArticleType && shouldNotifyReplyToCommentAuthor) {
      const isMentioned =
        !!data.mentionedUserIds?.includes(replyToCommentAuthor)

      if (!isMentioned) {
        notificationService.trigger({
          event: DB_NOTICE_TYPE.comment_new_reply,
          actorId: viewer.id,
          recipientId: replyToCommentAuthor,
          entities: [
            { type: 'target', entityTable: 'comment', entity: replyToComment },
            { type: 'reply', entityTable: 'comment', entity: newComment },
          ],
        })
      }
    }

    // article: notify article's subscribers
    if (isArticleType && article) {
      const articleSubscribers = await articleService.findSubscriptions({
        id: article.id,
      })
      articleSubscribers.forEach((subscriber: any) => {
        const isMentioned = !!data.mentionedUserIds?.includes(subscriber.id)

        if (!isMentioned) {
          notificationService.trigger({
            event: DB_NOTICE_TYPE.subscribed_article_new_comment,
            actorId: viewer.id,
            recipientId: subscriber.id,
            entities: [
              { type: 'target', entityTable: 'article', entity: article },
              { type: 'comment', entityTable: 'comment', entity: newComment },
            ],
          })
        }
      })
    }

    if (circle && (isCircleBroadcast || isCircleDiscussion)) {
      const recipients = await userService.findCircleRecipients(circle.id)

      // circle: notify members & followers for new broadcast
      if (isCircleBroadcast && isLevel1Comment) {
        recipients.forEach((recipientId: any) => {
          notificationService.trigger({
            event: DB_NOTICE_TYPE.circle_new_broadcast,
            actorId: viewer.id,
            recipientId,
            entities: [
              { type: 'target', entityTable: 'comment', entity: newComment },
            ],
          })
        })
      }

      // circle: notify owner, members & followers for new broadcast reply
      if (isCircleBroadcast && !isLevel1Comment) {
        cacheBundledNotices(DB_NOTICE_TYPE.circle_new_broadcast_comments, {
          event: BUNDLED_NOTICE_TYPE.circle_member_new_broadcast_reply,
          actorId: viewer.id,
          recipientId: circle.owner,
          entities: [{ type: 'target', entityTable: 'circle', entity: circle }],
          data: { replies: [newComment.id] },
        })

        recipients.forEach((recipientId: any) => {
          cacheBundledNotices(DB_NOTICE_TYPE.circle_new_broadcast_comments, {
            event: BUNDLED_NOTICE_TYPE.in_circle_new_broadcast_reply,
            actorId: viewer.id,
            recipientId,
            entities: [
              { type: 'target', entityTable: 'circle', entity: circle },
            ],
            data: { replies: [newComment.id] },
          })
        })
      }

      // circle: notify owner, members & followers for new discussion and reply
      if (isCircleDiscussion) {
        cacheBundledNotices(DB_NOTICE_TYPE.circle_new_discussion_comments, {
          event: isLevel1Comment
            ? BUNDLED_NOTICE_TYPE.circle_member_new_discussion
            : BUNDLED_NOTICE_TYPE.circle_member_new_discussion_reply,
          actorId: viewer.id,
          recipientId: circle.owner,
          entities: [{ type: 'target', entityTable: 'circle', entity: circle }],
          data: {
            comments: isLevel1Comment ? [newComment.id] : [],
            replies: isLevel1Comment ? [] : [newComment.id],
          },
        })

        recipients.forEach((recipientId: any) => {
          cacheBundledNotices(DB_NOTICE_TYPE.circle_new_discussion_comments, {
            event: isLevel1Comment
              ? BUNDLED_NOTICE_TYPE.in_circle_new_discussion
              : BUNDLED_NOTICE_TYPE.in_circle_new_discussion_reply,
            actorId: viewer.id,
            recipientId,
            entities: [
              { type: 'target', entityTable: 'circle', entity: circle },
            ],
            data: {
              comments: isLevel1Comment ? [newComment.id] : [],
              replies: isLevel1Comment ? [] : [newComment.id],
            },
          })
        })
      }
    }
  }

  // article & circle: notify mentioned users
  if (data.mentionedUserIds) {
    data.mentionedUserIds.forEach((userId: string) => {
      if (isArticleType) {
        notificationService.trigger({
          event: DB_NOTICE_TYPE.comment_mentioned_you,
          actorId: viewer.id,
          recipientId: userId,
          entities: [
            { type: 'target', entityTable: 'comment', entity: newComment },
          ],
        })
      } else if (!(isCircleBroadcast && isLevel1Comment)) {
        const noticeType = isCircleBroadcast
          ? DB_NOTICE_TYPE.circle_new_broadcast_comments
          : DB_NOTICE_TYPE.circle_new_discussion_comments
        const mentionedEvent = isCircleBroadcast
          ? BUNDLED_NOTICE_TYPE.circle_broadcast_mentioned_you // circle
          : BUNDLED_NOTICE_TYPE.circle_discussion_mentioned_you // circle
        cacheBundledNotices(noticeType, {
          event: mentionedEvent,
          actorId: viewer.id,
          recipientId: userId,
          entities: [{ type: 'target', entityTable: 'circle', entity: circle }],
          data: {
            comments: isLevel1Comment ? [newComment.id] : [],
            mentions: [newComment.id],
          },
        })
      }
    })
  }

  // trigger bundleable notices
  Object.keys(bundledNotices).forEach((k) => {
    notificationService.trigger(bundledNotices[k])
  })

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
