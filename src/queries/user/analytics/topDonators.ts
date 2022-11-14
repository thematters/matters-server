import { connectionFromArray, connectionFromPromisedArray } from 'common/utils'
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
  const start = input?.filter?.inRangeStart
  const end = input?.filter?.inRangeEnd

  const donatorsCount = await userService.countDonators(id, { start, end })
  const connection = await connectionFromPromisedArray(
    userService.topDonators(id, { start, end }),
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
