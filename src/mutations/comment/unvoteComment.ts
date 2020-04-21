import { USER_STATE } from 'common/enums'
import { AuthenticationError, ForbiddenError } from 'common/errors'
import { fromGlobalId, toGlobalId } from 'common/utils'
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
  const article = await articleService.dataloader.load(comment.articleId)

  // disallow onboarding unvote others' comment, and forbid archived user operation
  const isOnboarding = viewer.state === USER_STATE.onboarding
  const isArchived = viewer.state === USER_STATE.archived
  if ((article.authorId !== viewer.id && isOnboarding) || isArchived) {
    throw new ForbiddenError('viewer has no permission')
  }

  await commentService.unvote({ commentId: dbId, userId: viewer.id })

  // publish a PubSub event
  notificationService.pubsub.publish(
    toGlobalId({
      type: 'Article',
      id: article.id,
    }),
    article
  )

  return comment
}

export default resolver
