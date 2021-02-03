import _ from 'lodash'
import { v4 } from 'uuid'

import {
  CACHE_KEYWORD,
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
      systemService,
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
    data.articleId = article.id
    data.targetId = article.id

    targetAuthor = article.authorId
  } else if (circleId) {
    const { id: circleDbId } = fromGlobalId(circleId)
    circle = await articleService.dataloader.load(circleDbId)

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

  if (circle && !isTargetAuthor) {
    const records = await knex
      .select()
      .from('circle_subscription_item as csi')
      .join('circle_price', 'circle_price.id', 'csi.price_id')
      .join('circle_subscription as cs', 'cs.id', 'csi.subscription_id')
      .where({
        'cs.state': SUBSCRIPTION_STATE.active,
        'csi.user_id': viewer.id,
        'csi.archived': false,
        'circle_price.circle_id': circle.id,
        'circle_price.state': PRICE_STATE.active,
      })
    const isCircleMember = records && records.length > 0

    if (!isCircleMember || isCircleBroadcast) {
      throw new ForbiddenError('only circle members have the permission')
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
    data.replyTo = replyToDBId
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
        mentionedUserIds: data.mentionedUserIds,
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
        ...data,
        uuid: v4(),
      },
    })

    /**
     * Notifications
     */
    const articleAuthor = _.get(article, 'authorId')
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
        (articleAuthor !== parentCommentAuthor &&
          articleAuthor !== replyToCommentAuthor))

    if (shouldNotifyArticleAuthor) {
      notificationService.trigger({
        event: DB_NOTICE_TYPE.article_new_comment,
        actorId: viewer.id,
        recipientId: articleAuthor,
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
    const shouldNotifyParentCommentAuthor =
      isReplyLevel1Comment || parentCommentAuthor !== replyToCommentAuthor
    if (shouldNotifyParentCommentAuthor) {
      notificationService.trigger({
        event: DB_NOTICE_TYPE.comment_new_reply,
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
        event: DB_NOTICE_TYPE.comment_new_reply,
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
        if (subscriber.id === articleAuthor) {
          return
        }
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
  }

  // notify mentioned users
  if (data.mentionedUserIds) {
    data.mentionedUserIds.forEach((userId: string) => {
      notificationService.trigger({
        event: DB_NOTICE_TYPE.comment_mentioned_you,
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
    {
      id: article ? article.id : circle.id,
      type: article ? NODE_TYPES.article : NODE_TYPES.circle,
    },
  ]

  return newComment
}

export default resolver
