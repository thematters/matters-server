import type { GQLCircleResolvers } from 'definitions'

import { CIRCLE_ACTION } from 'common/enums'
import {
  connectionFromArray,
  connectionFromPromisedArray,
  fromConnectionArgs,
} from 'common/utils'

const resolver: GQLCircleResolvers['followers'] = async (
  { id },
  { input },
  { dataSources: { atomService, userService } }
) => {
  if (!id) {
    return connectionFromArray([], input)
  }

  const { take, skip } = fromConnectionArgs(input)

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
    userService.loadByIds(actions.map(({ userId }) => userId)),
    input,
    totalCount
  )
}

export default resolver
