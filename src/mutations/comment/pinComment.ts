import { AuthenticationError, ForbiddenError } from 'apollo-server'
import { MutationToPinCommentResolver } from 'definitions'
import { fromGlobalId } from 'common/utils'

const resolver: MutationToPinCommentResolver = async (
  _,
  { input: { id } },
  {
    viewer,
    dataSources: { commentService, articleService, notificationService }
  }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  const { id: dbId } = fromGlobalId(id)
  const comment = await commentService.dataloader.load(dbId)
  const article = await articleService.dataloader.load(comment.articleId)

  if (article.authorId !== viewer.id) {
    throw new ForbiddenError('viewer has no permission')
  }

  const pinLeft = await commentService.pinLeftByArticle(comment.articleId)
  if (pinLeft <= 0) {
    throw new ForbiddenError('reach pin limit')
  }

  // check is pinned before
  if (comment.pinned) {
    return comment
  }

  const pinnedComment = await commentService.baseUpdateById(dbId, {
    pinned: true
  })

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
  notificationService.trigger({
    event: 'comment_pinned',
    recipientId: comment.authorId,
    entities: [
      {
        type: 'target',
        entityTable: 'comment',
        entity: comment
      }
    ]
  })

  return pinnedComment
}

export default resolver
