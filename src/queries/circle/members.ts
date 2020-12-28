import { CIRCLE_ACTION } from 'common/enums'
import { connectionFromArray, cursorToIndex } from 'common/utils'
import { CircleToMembersResolver } from 'definitions'

const resolver: CircleToMembersResolver = async (
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
      where: { targetId: id, action: CIRCLE_ACTION.join },
    }),
    atomService.findMany({
      table: 'action_circle',
      select: ['user_id'],
      where: { targetId: id, action: CIRCLE_ACTION.join },
      skip,
      take,
    }),
  ])
  const members = (
    await atomService.userIdLoader.loadMany(actions.map(({ userId }) => userId))
  ).map((user) => ({ ...user, circleId: id }))

  return connectionFromArray(members, input, totalCount)
}

export default resolver
