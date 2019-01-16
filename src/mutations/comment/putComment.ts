import { AuthenticationError } from 'apollo-server'
import { MutationToPutCommentResolver } from 'definitions'
import { fromGlobalId } from 'common/utils'

const resolver: MutationToPutCommentResolver = async (
  _,
  { input: { comment, id } },
  {
    viewer,
    dataSources: { commentService, articleService, notificationService }
  }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('anonymous user cannot do this') // TODO
  }

  const { content, quotation, articleId, parentId, mentions } = comment
  const data: any = {
    content,
    authorId: viewer.id
  }

  const { id: authorDbId } = fromGlobalId(articleId)
  const article = await articleService.dataloader.load(authorDbId)
  if (!article) {
    throw new Error('target article does not exists') // TODO
  }
  data.articleId = article.id

  let parentComment: any
  if (parentId) {
    const { id: parentDbId } = fromGlobalId(parentId)
    parentComment = await commentService.dataloader.load(parentDbId)
    if (!parentComment) {
      throw new Error('target parentComment does not exists') // TODO
    }
    data.parentCommentId = parentComment.id
  }

  if (mentions) {
    data.mentionedUserIds = mentions.map(
      (userId: string) => fromGlobalId(userId).id
    )
  }

  // Update
  let newComment: any
  if (id) {
    const { id: commentDbId } = fromGlobalId(id)
    newComment = await commentService.update({ id: commentDbId, ...data })
  }
  // Create
  else {
    newComment = await commentService.create(data)

    // trigger notifications
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

  // trigger notifications
  notificationService.trigger({
    event: 'article_updated',
    entities: [
      {
        type: 'target',
        entityTable: 'article',
        entity: article
      }
    ]
  })
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
