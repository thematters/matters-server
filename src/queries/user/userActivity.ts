import {
  connectionFromArray,
  connectionFromPromisedArray,
  cursorToIndex,
} from 'common/utils'
import { GQLUserActivityTypeResolver } from 'definitions'

const resolver: GQLUserActivityTypeResolver = {
  history: async (
    { id },
    { input },
    { dataSources: { userService, articleService, draftService } }
  ) => {
    if (!id) {
      return connectionFromArray([], input)
    }

    const { first, after } = input
    const offset = cursorToIndex(after) + 1

    const [totalCount, reads] = await Promise.all([
      userService.countReadHistory(id),
      userService.findReadHistory({ userId: id, offset, limit: first }),
    ])
    const nodes = await Promise.all(
      reads.map(async ({ article, readAt }) => {
        const node = await draftService.dataloader.load(article.draftId)
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
    { input = {} },
    { dataSources: { userService } }
  ) => {
    const { first, after } = input

    const offset = after ? cursorToIndex(after) + 1 : 0
    const totalCount = await userService.totalSentAppreciationCount(id)
    return connectionFromPromisedArray(
      userService.findAppreciationBySender({
        senderId: id,
        limit: first,
        offset,
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
    const totalCount = await userService.totalRecivedAppreciationCount(id)
    return connectionFromPromisedArray(
      userService.findAppreciationByRecipient({
        recipientId: id,
        limit: first,
        offset,
      }),
      input,
      totalCount
    )
  },

  appreciationsReceivedTotal: ({ id }, _, { dataSources: { userService } }) =>
    userService.totalRecived(id),
}

export default resolver
