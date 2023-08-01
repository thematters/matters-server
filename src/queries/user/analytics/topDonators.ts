import type { GQLUserAnalyticsResolvers } from 'definitions'

import {
  connectionFromArray,
  connectionFromPromisedArray,
  fromConnectionArgs,
} from 'common/utils'

const resolver: GQLUserAnalyticsResolvers['topDonators'] = async (
  { id },
  { input },
  { dataSources: { userService } }
) => {
  if (!id) {
    return connectionFromArray([], input)
  }
  const range = {
    start: input?.filter?.inRangeStart,
    end: input?.filter?.inRangeEnd,
  }
  const pagination = fromConnectionArgs(input)

  const donatorsCount = await userService.countDonators(id, range)
  const connection = await connectionFromPromisedArray(
    userService.topDonators(id, range, pagination),
    input,
    donatorsCount
  )
  return {
    ...connection,
    edges: connection.edges.map(async (edge) => ({
      cursor: edge.cursor,
      node: await userService.loadById(edge.node.senderId),
      donationCount: edge.node.count,
    })),
  } as any
}

export default resolver
