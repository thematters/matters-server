import { COMMENT_STATE, COMMENT_TYPE } from 'common/enums'
import { connectionFromArray, cursorToIndex } from 'common/utils'
import { CircleToBroadcastResolver } from 'definitions'

const resolver: CircleToBroadcastResolver = async (
  { id },
  { input },
  { dataSources: { atomService } }
) => {
  if (!id) {
    return connectionFromArray([], input)
  }

  const { first: take, after } = input
  const skip = cursorToIndex(after) + 1

  const [totalCount, comments] = await Promise.all([
    atomService.count({
      table: 'comment',
      where: {
        state: COMMENT_STATE.active,
        targetId: id,
        type: COMMENT_TYPE.circleBroadcast,
      },
    }),
    atomService.findMany({
      table: 'comment',
      where: {
        state: COMMENT_STATE.active,
        targetId: id,
        type: COMMENT_TYPE.circleBroadcast,
      },
      skip,
      take,
      orderBy: [
        { column: 'pinned', order: 'desc' },
        { column: 'created_at', order: 'desc' },
      ],
    }),
  ])

  return connectionFromArray(comments, input, totalCount)
}

export default resolver
