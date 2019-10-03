import {
  connectionFromArray,
  connectionFromPromisedArray,
  cursorToIndex
} from 'common/utils'
import { GQLUserActivityTypeResolver } from 'definitions'

const resolver: GQLUserActivityTypeResolver = {
  history: async (
    { id },
    { input },
    { dataSources: { userService, articleService } }
  ) => {
    if (!id) {
      return connectionFromArray([], input)
    }

    const { first, after } = input
    const offset = cursorToIndex(after) + 1
    const totalCount = await userService.countReadHistory(id)

    return connectionFromPromisedArray(
      userService.findReadHistory({
        userId: id,
        offset,
        limit: first
      }),
      input,
      totalCount
    )
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
    { input = {} },
    { dataSources: { userService } }
  ) => {
    const { first, after } = input

    const offset = after ? cursorToIndex(after) + 1 : 0
    const totalCount = await userService.totalSentTransactionCount(id)
    return connectionFromPromisedArray(
      userService.findTransactionBySender({
        senderId: id,
        limit: first,
        offset
      }),
      input,
      totalCount
    )
  },

  appreciationsSentTotal: ({ id }, _, { dataSources: { userService } }) =>
    userService.totalSent(id),

  appreciationsReceived: async (
    { id },
    { input = {} },
    { dataSources: { userService } }
  ) => {
    const { first, after } = input

    const offset = after ? cursorToIndex(after) + 1 : 0
    const totalCount = await userService.totalRecivedTransactionCount(id)
    return connectionFromPromisedArray(
      userService.findTransactionByRecipient({
        recipientId: id,
        limit: first,
        offset
      }),
      input,
      totalCount
    )
  },

  appreciationsReceivedTotal: ({ id }, _, { dataSources: { userService } }) =>
    userService.totalRecived(id)
}

export default resolver
