import pMap from 'p-map'

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
    const readHistory = await userService.findReadHistory({
      userId: id,
      offset,
      limit: first
    })

    return connectionFromPromisedArray(
      pMap(readHistory, async ({ articleId, readAt }: any) => {
        const article = await articleService.dataloader.load(articleId)
        return {
          article,
          readAt
        }
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
  }
}

export default resolver
