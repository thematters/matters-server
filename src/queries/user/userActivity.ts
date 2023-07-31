import {
  connectionFromArray,
  connectionFromPromisedArray,
  fromConnectionArgs,
} from 'common/utils'
import { GQLUserActivityTypeResolver } from 'definitions'

const resolver: GQLUserActivityTypeResolver = {
  history: async (
    { id },
    { input },
    { dataSources: { userService, draftService } }
  ) => {
    if (!id) {
      return connectionFromArray([], input)
    }

    const { take, skip } = fromConnectionArgs(input)

    const [totalCount, reads] = await Promise.all([
      userService.countReadHistory(id),
      userService.findReadHistory({ userId: id, skip, take }),
    ])
    const nodes = await Promise.all(
      reads.map(async ({ article, readAt }) => {
        const node = await draftService.loadById(article.draftId)
        return { readAt, article: node }
      })
    )

    return connectionFromArray(nodes, input, totalCount)
  },

  recentSearches: async (
    { id },
    { input },
    { dataSources: { userService } }
  ) => {
    if (!id) {
      return connectionFromArray([], input)
    }
    return connectionFromPromisedArray(
      userService.findRecentSearches(id),
      input
    )
  },

  appreciationsSent: async (
    { id },
    { input },
    { dataSources: { userService } }
  ) => {
    const { take, skip } = fromConnectionArgs(input)
    const totalCount = await userService.totalSentAppreciationCount(id)
    return connectionFromPromisedArray(
      userService.findAppreciationBySender({ senderId: id, skip, take }),
      input,
      totalCount
    )
  },

  appreciationsSentTotal: ({ id }, _, { dataSources: { userService } }) =>
    userService.totalSent(id),

  appreciationsReceived: async (
    { id },
    { input },
    { dataSources: { userService } }
  ) => {
    const { take, skip } = fromConnectionArgs(input)

    const totalCount = await userService.totalRecivedAppreciationCount(id)
    return connectionFromPromisedArray(
      userService.findAppreciationByRecipient({ recipientId: id, skip, take }),
      input,
      totalCount
    )
  },

  appreciationsReceivedTotal: ({ id }, _, { dataSources: { userService } }) =>
    userService.totalRecived(id),
}

export default resolver
