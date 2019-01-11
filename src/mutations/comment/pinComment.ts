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
    throw new Error('anonymous user cannot do this') // TODO
  }

  const { id: dbId } = fromGlobalId(id)
  const { articleId } = await commentService.dataloader.load(dbId)
  const { authorId } = await articleService.dataloader.load(articleId)

  if (authorId !== viewer.id) {
    throw new Error('viewer has no permission to do this') // TODO
  }

  const pinLeft = await commentService.pinLeftByArticle(articleId)
  if (pinLeft <= 0) {
    throw new Error('reach pin limit') // TODO
  }

  // TODO: check pinned before

  const comment = await commentService.baseUpdateById(dbId, {
    pinned: true
  })

  // trigger notifications
  const article = await articleService.dataloader.load(articleId)
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

  return comment
}

export default resolver
