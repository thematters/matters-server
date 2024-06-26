import type { GQLMutationResolvers, Article, Circle } from 'definitions'

import { COMMENT_TYPE, USER_STATE } from 'common/enums'
import { ForbiddenByStateError, ForbiddenError } from 'common/errors'
import { fromGlobalId } from 'common/utils'

const resolver: GQLMutationResolvers['voteComment'] = async (
  _,
  { input: { id, vote } },
  { viewer, dataSources: { atomService, paymentService, commentService } }
) => {
  if (!viewer.userName) {
    throw new ForbiddenError('user has no username')
  }

  const { id: dbId } = fromGlobalId(id)
  const comment = await atomService.commentIdLoader.load(dbId)

  // check target
  let article: Article
  let circle: Circle | undefined = undefined
  let targetAuthor: string
  if (comment.type === COMMENT_TYPE.article) {
    article = await atomService.articleIdLoader.load(comment.targetId)
    targetAuthor = article.authorId
  } else {
    circle = await atomService.circleIdLoader.load(comment.targetId)
    targetAuthor = circle.owner
  }

  // check permission
  const isTargetAuthor = targetAuthor === viewer.id
  const isInactive = [
    USER_STATE.banned,
    USER_STATE.archived,
    USER_STATE.frozen,
  ].includes(viewer.state)

  if (isInactive) {
    throw new ForbiddenByStateError(`${viewer.state} user has no permission`)
  }

  if (circle && !isTargetAuthor) {
    const isCircleMember = await paymentService.isCircleMember({
      userId: viewer.id,
      circleId: circle.id,
    })

    if (!isCircleMember) {
      throw new ForbiddenError('only circle members have the permission')
    }
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

  return comment
}

export default resolver
