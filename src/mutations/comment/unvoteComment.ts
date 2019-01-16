import { AuthenticationError, ForbiddenError } from 'apollo-server'
import { MutationToUnvoteCommentResolver } from 'definitions'
import { fromGlobalId } from 'common/utils'

const resolver: MutationToUnvoteCommentResolver = async (
  _,
  { input: { id } },
  {
    viewer,
    dataSources: { articleService, commentService, notificationService }
  }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  const { id: dbId } = fromGlobalId(id)

  // check is voted before
  const voted = await commentService.findVotesByUserId({
    userId: viewer.id,
    commentId: dbId
  })
  if (!voted || voted.length <= 0) {
    throw new ForbiddenError('no vote before')
  }

  await commentService.unvote({ commentId: dbId, userId: viewer.id })
  const comment = await commentService.dataloader.load(dbId)
  const article = await articleService.dataloader.load(comment.articleId)

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

  return comment
}

export default resolver
