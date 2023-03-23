import { CIRCLE_ACTION } from 'common/enums/index.js'
import {
  connectionFromArray,
  connectionFromPromisedArray,
  fromConnectionArgs,
} from 'common/utils/index.js'
import { FollowingToCirclesResolver } from 'definitions'

const resolver: FollowingToCirclesResolver = async (
  { id },
  { input },
  { dataSources: { atomService } }
) => {
  if (!id) {
    return connectionFromArray([], input)
  }

  const { take, skip } = fromConnectionArgs(input)

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
