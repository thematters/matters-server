import {
  connectionFromArray,
  connectionFromPromisedArray,
  fromConnectionArgs,
} from 'common/utils'
import { GQLUserActivityResolvers } from 'definitions'

const resolver: GQLUserActivityResolvers = {
  history: async ({ id }, { input }, { dataSources: { userService } }) => {
    if (!id) {
      return connectionFromArray([], input)
    }

    const { take, skip } = fromConnectionArgs(input)

    const [totalCount, reads] = await Promise.all([
      userService.countReadHistory(id),
      userService.findReadHistory({ userId: id, skip, take }),
    ])

    return connectionFromArray(reads, input, totalCount)
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
    if (!id) {
      return connectionFromArray([], input)
    }
    const { take, skip } = fromConnectionArgs(input)
    const totalCount = await userService.totalSentAppreciationCount(id)
    return connectionFromPromisedArray(
      userService.findAppreciationBySender({ senderId: id, skip, take }),
      input,
      totalCount
    )
  },

  appreciationsSentTotal: ({ id }, _, { dataSources: { userService } }) => {
    if (!id) {
      return 0
    }
    return userService.totalSent(id)
  },

  appreciationsReceived: async (
    { id },
    { input },
    { dataSources: { userService } }
  ) => {
    if (!id) {
      return connectionFromArray([], input)
    }
    const { take, skip } = fromConnectionArgs(input)

    const totalCount = await userService.totalRecivedAppreciationCount(id)
    return connectionFromPromisedArray(
      userService.findAppreciationByRecipient({ recipientId: id, skip, take }),
      input,
      totalCount
    )
  },

  appreciationsReceivedTotal: ({ id }, _, { dataSources: { userService } }) => {
    if (!id) {
      return 0
    }
    return userService.totalRecived(id)
  },
}

export default resolver
