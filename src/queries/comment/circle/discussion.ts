import { COMMENT_STATE, COMMENT_TYPE } from 'common/enums'
import { connectionFromArray, fromConnectionArgs } from 'common/utils'
import { CircleToDiscussionResolver } from 'definitions'

const resolver: CircleToDiscussionResolver = async (
  { id, owner },
  { input },
  { viewer, dataSources: { atomService, paymentService } }
) => {
  if (!id || !viewer.id) {
    return connectionFromArray([], input)
  }

  const isCircleMember = await paymentService.isCircleMember({
    userId: viewer.id,
    circleId: id,
  })
  const isCircleOwner = viewer.id === owner

  if (!isCircleMember && !isCircleOwner) {
    return connectionFromArray([], input)
  }

  const { take, skip } = fromConnectionArgs(input)

  const where = {
    state: COMMENT_STATE.active,
    parentCommentId: null,
    targetId: id,
    type: COMMENT_TYPE.circleDiscussion,
  }
  const [totalCount, comments] = await Promise.all([
    atomService.count({
      table: 'comment',
      where,
    }),
    atomService.findMany({
      table: 'comment',
      where,
      skip,
      take,
      orderBy: [{ column: 'created_at', order: 'desc' }],
    }),
  ])
  return connectionFromArray(comments, input, totalCount)
}

export default resolver
