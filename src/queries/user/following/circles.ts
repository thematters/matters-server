import type { GQLFollowingResolvers, Circle } from 'definitions'

import { CIRCLE_ACTION } from 'common/enums'
import {
  connectionFromArray,
  connectionFromPromisedArray,
  fromConnectionArgs,
} from 'common/utils'

const resolver: GQLFollowingResolvers['circles'] = async (
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
      select: ['targetId'],
      where: { userId: id, action: CIRCLE_ACTION.follow },
      skip,
      take,
    }),
  ])

  return connectionFromPromisedArray(
    atomService.circleIdLoader.loadMany(
      actions.map(({ targetId }) => targetId)
    ) as Promise<Circle[]>,
    input,
    totalCount
  )
}

export default resolver
