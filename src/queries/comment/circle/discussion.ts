import { COMMENT_STATE } from 'common/enums'
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

  const { id: typeId } = await atomService.findFirst({
    table: 'entity_type',
    where: { table: 'comment' },
  })
  // TODO: add filter for discussion
  const [totalCount, comments] = await Promise.all([
    atomService.count({
      table: 'comment',
      where: {
        state: COMMENT_STATE.active,
        targetId: id,
        targetTypeId: typeId,
      },
    }),
    atomService.findMany({
      table: 'comment',
      where: {
        state: COMMENT_STATE.active,
        targetId: id,
        targetTypeId: typeId,
      },
      skip,
      take,
    }),
  ])

  return connectionFromArray(comments, input, totalCount)
}

export default resolver
