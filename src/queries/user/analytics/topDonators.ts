import type { GQLUserAnalyticsToResolvers } from 'definitions'

import {
  connectionFromArray,
  connectionFromPromisedArray,
  fromConnectionArgs,
} from 'common/utils'

const resolver: GQLUserAnalyticsToResolvers['pDonators'] = async (
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
  }
}

export default resolver
