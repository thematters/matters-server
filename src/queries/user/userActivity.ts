import {
  connectionFromPromisedArray,
  cursorToIndex,
  connectionFromArray
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
  appreciations: ({ id }, { input }, { dataSources: { userService } }) => {
    // const first,
    // offset
    // userService.findTransactionBySender({ senderId: id, })
    // TODO
    return connectionFromArray([], input || {})
  },
  totalAppreciation: ({ id }, _, { dataSources: { userService } }) =>
    userService.totalSent(id),
  appreciatedBy: ({ id }, { input }, { dataSources: { userService } }) => {
    // userService.findTransactionByRecipient(id)
    // TODO
    return connectionFromArray([], input || {})
  },
  totalAppreciatedBy: ({ id }, _, { dataSources: { userService } }) =>
    userService.totalRecived(id)
}

export default resolver
