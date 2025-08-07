import type { GQLUserAnalyticsResolvers } from '#definitions/index.js'

import { connectionFromQueryOffsetBased } from '#common/utils/index.js'

const resolver: GQLUserAnalyticsResolvers['topDonators'] = async (
  { id },
  { input },
  { dataSources: { userService, atomService } }
) => {
  if (!id) {
    return {
      edges: [],
      pageInfo: {
        hasPreviousPage: false,
        hasNextPage: false,
      },
      totalCount: 0,
    }
  }
  const range = {
    start: input?.filter?.inRangeStart,
    end: input?.filter?.inRangeEnd,
  }
  const connection = await connectionFromQueryOffsetBased<{
    id: string
    address: string
    donationCount: number
    latestDonationAt: Date
  }>({
    query: userService.findTopDonators(id, range),
    args: input,
    orderBy: [
      { column: 'donationCount', order: 'desc' },
      { column: 'latestDonationAt', order: 'desc' },
    ],
  })
  return {
    ...connection,
    edges: connection.edges.map(async (edge) => ({
      ...edge,
      node: edge.node.id
        ? {
            __type: 'User',
            ...(await atomService.userIdLoader.load(edge.node.id)),
          }
        : { __type: 'CryptoWallet', address: edge.node.address },
      donationCount: edge.node.donationCount,
    })),
  }
}

export default resolver
