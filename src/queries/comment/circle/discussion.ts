import { COMMENT_STATE, COMMENT_TYPE } from 'common/enums'
import { connectionFromArray, cursorToIndex } from 'common/utils'
import { CircleToDiscussionResolver } from 'definitions'

const resolver: CircleToDiscussionResolver = async (
  { id },
  { input },
  { dataSources: { atomService } }
) => {
  if (!id) {
    return connectionFromArray([], input)
  }

  const { first: take, after } = input
  const skip = cursorToIndex(after) + 1

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
