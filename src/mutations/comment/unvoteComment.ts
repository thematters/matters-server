import { USER_STATE } from 'common/enums'
import { AuthenticationError, ForbiddenByStateError } from 'common/errors'
import { fromGlobalId } from 'common/utils'
import { MutationToUnvoteCommentResolver } from 'definitions'

const resolver: MutationToUnvoteCommentResolver = async (
  _,
  { input: { id } },
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

  // TODO: update for comment in circles
  const article = await articleService.dataloader.load(comment.articleId)

  // disallow onboarding user unvote in others' articles, and forbid archived user operation
  const isOnboarding = viewer.state === USER_STATE.onboarding
  const isInactive =
    viewer.state === USER_STATE.archived || viewer.state === USER_STATE.frozen
  if ((article.authorId !== viewer.id && isOnboarding) || isInactive) {
    throw new ForbiddenByStateError(`${viewer.state} user has no permission`)
  }

  await commentService.unvote({ commentId: dbId, userId: viewer.id })

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
