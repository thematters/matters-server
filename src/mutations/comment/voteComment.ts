import { USER_STATE } from 'common/enums'
import { AuthenticationError, ForbiddenError } from 'common/errors'
import { fromGlobalId, toGlobalId } from 'common/utils'
import { MutationToVoteCommentResolver } from 'definitions'

const resolver: MutationToVoteCommentResolver = async (
  _,
  { input: { id, vote } },
  {
    viewer,
    dataSources: { articleService, commentService, notificationService },
  }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  const { id: dbId } = fromGlobalId(id)
  const comment = await commentService.dataloader.load(dbId)
  const article = await articleService.dataloader.load(comment.articleId)

  // disallow onboarding user vote in others' articles, and forbid archived user operation
  const isOnboarding = viewer.state === USER_STATE.onboarding
  const isArchived = viewer.state === USER_STATE.archived
  if ((article.authorId !== viewer.id && isOnboarding) || isArchived) {
    throw new ForbiddenError('viewer has no permission')
  }

  // check is voted before
  const voted = await commentService.findVotesByUserId({
    userId: viewer.id,
    commentId: dbId,
  })
  if (voted && voted.length > 0) {
    await commentService.removeVotesByUserId({
      userId: viewer.id,
      commentId: dbId,
    })
  }

  await commentService.vote({ commentId: dbId, vote, userId: viewer.id })

  // publish a PubSub event
  // notificationService.pubsub.publish(
  //   toGlobalId({
  //     type: 'Article',
  //     id: article.id,
  //   }),
  //   article
  // )

  return comment
}

export default resolver
