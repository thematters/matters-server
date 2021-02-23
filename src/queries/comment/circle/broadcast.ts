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

  const where = {
    state: COMMENT_STATE.active,
    parentCommentId: null,
    targetId: id,
    type: COMMENT_TYPE.circleBroadcast,
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
      orderByRaw: `
        pinned DESC,
        CASE pinned
        WHEN true THEN
          pinned_at
        WHEN false THEN
          created_at
        END DESC
      `,
    }),
  ])

  return connectionFromArray(comments, input, totalCount)
}

export default resolver
