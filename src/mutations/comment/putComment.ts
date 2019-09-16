import _ from 'lodash'

import { MutationToPutCommentResolver } from 'definitions'
import { fromGlobalId, toGlobalId, sanitize, countWords } from 'common/utils'
import {
  AuthenticationError,
  UserInputError,
  ArticleNotFoundError,
  CommentNotFoundError,
  ForbiddenError
} from 'common/errors'
import { USER_STATE } from 'common/enums'

const resolver: MutationToPutCommentResolver = async (
  root,
  { input: { comment, id } },
  {
    viewer,
    dataSources: {
      commentService,
      articleService,
      notificationService,
      userService
    }
  }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  const {
    content,
    articleId,
    parentId,
    mentions,
    quotationStart,
    quotationEnd,
    quotationContent,
    replyTo
  } = comment

  if (!content || content.length <= 0) {
    throw new UserInputError(
      `"content" is required and must be at least 1 character`
    )
  }

  let data: any = {
    content: sanitize(content),
    authorId: viewer.id
  }

  // check quotation input
  const quotationInputs = _.filter(
    [quotationStart, quotationEnd, quotationContent],
    o => !_.isNil(o)
  )
  if (quotationInputs.length > 0) {
    if (quotationInputs.length < 3) {
      throw new UserInputError(
        `Quotation needs fields "quotationStart, quotationEnd, quotationContent"`
      )
    }

    data = {
      ...data,
      quotationStart,
      quotationEnd,
      quotationContent: sanitize(quotationContent || '')
    }
  }

  // check target article
  const { id: authorDbId } = fromGlobalId(articleId)
  const article = await articleService.dataloader.load(authorDbId)
  if (!article) {
    throw new ArticleNotFoundError('target article does not exists')
  }
  data.articleId = article.id

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
  }

  // Create
  else {
    newComment = await commentService.create(data)

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
            entity: article
          },
          {
            type: 'comment',
            entityTable: 'comment',
            entity: newComment
          }
        ]
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
            entity: parentComment
          },
          {
            type: 'reply',
            entityTable: 'comment',
            entity: newComment
          }
        ]
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
            entity: replyToComment
          },
          {
            type: 'reply',
            entityTable: 'comment',
            entity: newComment
          }
        ]
      })
    }

    // notify article's subscribers
    const articleSubscribers = await articleService.findSubscriptions({
      id: article.id
    })
    articleSubscribers.forEach((subscriber: any) => {
      if (subscriber.id == articleAuthor) {
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
            entity: article
          },
          {
            type: 'comment',
            entityTable: 'comment',
            entity: newComment
          }
        ]
      })
    })

    // Add custom cache-key
    newComment['cache'] = {
      id: article.id,
      type: 'Article'
    }
  }

  // publish a PubSub event
  notificationService.pubsub.publish(
    toGlobalId({
      type: 'Article',
      id: article.id
    }),
    article
  )

  // trigger notifications
  // notify mentioned users
  data.mentionedUserIds &&
    data.mentionedUserIds.forEach((userId: string) => {
      notificationService.trigger({
        event: 'comment_mentioned_you',
        actorId: viewer.id,
        recipientId: userId,
        entities: [
          {
            type: 'target',
            entityTable: 'comment',
            entity: newComment
          }
        ]
      })
    })

  return newComment
}

export default resolver
