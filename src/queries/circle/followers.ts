import { CIRCLE_ACTION } from 'common/enums'
import {
  connectionFromArray,
  connectionFromPromisedArray,
  cursorToIndex,
} from 'common/utils'
import { CircleToFollowersResolver } from 'definitions'

const resolver: CircleToFollowersResolver = async (
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
      where: { targetId: id, action: CIRCLE_ACTION.follow },
    }),
    atomService.findMany({
      table: 'action_circle',
      select: ['user_id'],
      where: { targetId: id, action: CIRCLE_ACTION.follow },
      skip,
      take,
    }),
  ])

  return connectionFromPromisedArray(
    atomService.userIdLoader.loadMany(actions.map(({ userId }) => userId)),
    input,
    totalCount
  )
}

export default resolver
