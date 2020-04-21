import _ from 'lodash'

import { CACHE_KEYWORD, NODE_TYPES, USER_STATE } from 'common/enums'
import {
  ArticleNotFoundError,
  AuthenticationError,
  CommentNotFoundError,
  ForbiddenError,
  UserInputError,
} from 'common/errors'
import { countWords, fromGlobalId, sanitize, toGlobalId } from 'common/utils'
import { MutationToPutCommentResolver } from 'definitions'

const resolver: MutationToPutCommentResolver = async (
  root,
  { input: { comment: commentInput, id } },
  {
    viewer,
    dataSources: {
      commentService,
      articleService,
      notificationService,
      userService,
    },
  }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  const { content, articleId, parentId, mentions, replyTo } = commentInput

  if (!content || content.length <= 0) {
    throw new UserInputError(
      `"content" is required and must be at least 1 character`
    )
  }

  const data: any = {
    content: sanitize(content),
    authorId: viewer.id,
  }

  // check target article
  const { id: articleDbId } = fromGlobalId(articleId)
  const article = await articleService.dataloader.load(articleDbId)
  if (!article) {
    throw new ArticleNotFoundError('target article does not exists')
  }

  // disallow onboarding unvote others' comment, and forbid archived user operation
  const isOnboarding = viewer.state === USER_STATE.onboarding
  const isArchived = viewer.state === USER_STATE.archived
  if ((article.authorId !== viewer.id && isOnboarding) || isArchived) {
    throw new ForbiddenError('viewer has no permission')
  }

  // check whether viewer is blocked by article author
  const isBlocked = await userService.blocked({
    userId: article.authorId,
    targetId: viewer.id,
  })
  if (isBlocked) {
    throw new ForbiddenError('viewer is blocked by article author')
  }

  // check parentComment
  let parentComment: any
  if (parentId) {
    const { id: parentDbId } = fromGlobalId(parentId)
    parentComment = await commentService.dataloader.load(parentDbId)
    if (!parentComment) {
      throw new CommentNotFoundError('target parentComment does not exists')
    }
    data.parentCommentId = parentComment.id
  }

  // check reply to
  let replyToComment: any
  if (replyTo) {
    const { id: replyToDBId } = fromGlobalId(replyTo)
    replyToComment = await commentService.dataloader.load(replyToDBId)
    data.replyTo = replyToDBId
  }

  // check mentions
  if (mentions) {
    data.mentionedUserIds = mentions.map(
      (userId: string) => fromGlobalId(userId).id
    )
  }

  // Update
  let newComment: any
  if (id) {
    const { id: commentDbId } = fromGlobalId(id)

    // check permission
    const comment = await commentService.dataloader.load(commentDbId)
    if (comment.authorId !== viewer.id) {
      throw new ForbiddenError('viewer has no permission')
    }

    newComment = await commentService.update({ id: commentDbId, ...data })

    // Add custom data for cache invalidation
    newComment[CACHE_KEYWORD] = [
      {
        id: article.id,
        type: NODE_TYPES.article,
      },
      {
        id: comment.id,
        type: NODE_TYPES.comment,
      },
    ]
  }

  // Create
  else {
    newComment = await commentService.create({ ...data, articleId: article.id })

    /**
     * Notifications
     *
     */
    const articleAuthor = _.get(article, 'authorId')
    const parentCommentAuthor = _.get(parentComment, 'authorId')
    const parentCommentId = _.get(parentComment, 'id')
    const replyToCommentAuthor = _.get(replyToComment, 'authorId')
    const replyToCommentId = _.get(replyToComment, 'id')

    const isLevel1Comment = !parentComment && !replyToComment
    const isReplyingLevel1Comment =
      !isLevel1Comment && parentCommentId === replyToCommentId
    const isReplyingLevel2Comment =
      !isLevel1Comment && parentCommentId !== replyToCommentId

    // notify article's author
    const shouldNotifyArticleAuthor =
      isLevel1Comment ||
      (articleAuthor !== parentCommentAuthor &&
        articleAuthor !== replyToCommentAuthor)
    if (shouldNotifyArticleAuthor) {
      notificationService.trigger({
        event: 'article_new_comment',
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
      isReplyingLevel1Comment || parentCommentAuthor !== replyToCommentAuthor
    if (shouldNotifyParentCommentAuthor) {
      notificationService.trigger({
        event: 'comment_new_reply',
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
        event: 'comment_new_reply',
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
    const articleSubscribers = await articleService.findSubscriptions({
      id: article.id,
    })
    articleSubscribers.forEach((subscriber: any) => {
      if (subscriber.id === articleAuthor) {
        return
      }
      notificationService.trigger({
        event: 'subscribed_article_new_comment',
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

    // Add custom data for cache invalidation
    newComment[CACHE_KEYWORD] = [
      {
        id: article.id,
        type: NODE_TYPES.article,
      },
    ]
  }

  // publish a PubSub event
  notificationService.pubsub.publish(
    toGlobalId({
      type: 'Article',
      id: article.id,
    }),
    article
  )

  // trigger notifications
  // notify mentioned users
  if (data.mentionedUserIds) {
    data.mentionedUserIds.forEach((userId: string) => {
      notificationService.trigger({
        event: 'comment_mentioned_you',
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

  return newComment
}

export default resolver
