import { USER_STATE } from 'common/enums'
import { AuthenticationError, ForbiddenError } from 'common/errors'
import { fromGlobalId, toGlobalId } from 'common/utils'
import { MutationToVoteCommentResolver } from 'definitions'

const resolver: MutationToVoteCommentResolver = async (
  _,
  { input: { id, vote } },
  {
    viewer,
    dataSources: { articleService, commentService, notificationService }
  }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  if (viewer.state !== USER_STATE.active) {
    throw new ForbiddenError('viewer has no permission')
  }

  const { id: dbId } = fromGlobalId(id)

  // check is voted before
  const voted = await commentService.findVotesByUserId({
    userId: viewer.id,
    commentId: dbId
  })
  if (voted && voted.length > 0) {
    await commentService.removeVotesByUserId({
      userId: viewer.id,
      commentId: dbId
    })
  }

  await commentService.vote({ commentId: dbId, vote, userId: viewer.id })
  const comment = await commentService.dataloader.load(dbId)
  const article = await articleService.dataloader.load(comment.articleId)

  // trigger notifications
  if (vote === 'up') {
    notificationService.trigger({
      event: 'comment_new_upvote',
      recipientId: comment.authorId,
      actorId: viewer.id,
      entities: [{ type: 'target', entityTable: 'comment', entity: comment }]
    })
  }

  // publish a PubSub event
  notificationService.pubsub.publish(
    toGlobalId({
      type: 'Article',
      id: article.id
    }),
    article
  )

  return comment
}

export default resolver
