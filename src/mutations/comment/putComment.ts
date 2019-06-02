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
  if (replyTo) {
    data.replyTo = fromGlobalId(replyTo).id
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

    // check if we should activate user
    if (viewer.state === USER_STATE.onboarding) {
      const activate = async () => {
        await userService.activate({ recipientId: viewer.id })

        // notice user
        notificationService.trigger({
          event: 'user_activated_by_task',
          recipientId: viewer.id
        })
      }

      if (countWords(data.content) > 200) {
        activate()
      } else {
        const comments = await commentService.findByAuthor(viewer.id)
        const totalWordCount = comments
          .map(({ content }) => countWords(content))
          .reduce((a, b) => a + b)
        if (comments.length > 3 && totalWordCount > 420) {
          activate()
        }
      }
    }

    // trigger notifications
    // notify article's author
    notificationService.trigger({
      event: 'article_new_comment',
      actorId: viewer.id,
      recipientId: article.authorId,
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
    // notify article's subscribers
    const articleSubscribers = await articleService.findSubscriptions({
      id: article.id
    })
    articleSubscribers.forEach((subscriber: any) => {
      if (subscriber.id == article.authorId) {
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
    if (parentComment) {
      // notify parent comment
      notificationService.trigger({
        event: 'comment_new_reply',
        actorId: viewer.id,
        recipientId: parentComment.authorId,
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
