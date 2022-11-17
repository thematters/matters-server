import {
  connectionFromArray,
  connectionFromPromisedArray,
  fromConnectionArgs,
} from 'common/utils'
import { UserAnalyticsToTopDonatorsResolver } from 'definitions'

const resolver: UserAnalyticsToTopDonatorsResolver = async (
  { id },
  { input },
  { dataSources: { userService } },
  { cacheControl }
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
    edges: await connection.edges.map(async (edge) => ({
      cursor: edge.cursor,
      node: await userService.dataloader.load(edge.node.senderId),
      donationCount: edge.node.count,
    })),
  }
}

export default resolver
