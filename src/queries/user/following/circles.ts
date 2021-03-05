import { CIRCLE_ACTION } from 'common/enums'
import {
  connectionFromArray,
  connectionFromPromisedArray,
  cursorToIndex,
} from 'common/utils'
import { FollowingToCirclesResolver } from 'definitions'

const resolver: FollowingToCirclesResolver = async (
  { id },
  { input },
  { dataSources: { atomService } }
) => {
  if (!id) {
    return connectionFromArray([], input)
  }

  const { first: take, after } = input
  const skip = cursorToIndex(after) + 1
  const [totalCount, actions] = await Promise.all([
    atomService.count({
      table: 'action_circle',
      where: { userId: id, action: CIRCLE_ACTION.follow },
    }),
    atomService.findMany({
      table: 'action_circle',
      select: ['target_id'],
      where: { userId: id, action: CIRCLE_ACTION.follow },
      skip,
      take,
    }),
  ])

  return connectionFromPromisedArray(
    atomService.circleIdLoader.loadMany(
      actions.map(({ targetId }) => targetId)
    ),
    input,
    totalCount
  )
}

export default resolver
