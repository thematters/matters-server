import {
  connectionFromPromisedArray,
  cursorToIndex,
  connectionFromArray
} from 'common/utils'

import { GQLUserActivityTypeResolver } from 'definitions'
import article from 'types/article'

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
    // const readHistory = await userService.findReadHistory({
    //   userId: id,
    //   offset,
    //   limit: first
    // })

    return connectionFromPromisedArray(
      userService
        .findReadHistory({
          userId: id,
          offset,
          limit: first
        })
        .then(articles =>
          articles.map(({ readAt, ...article }: any) => ({ readAt, article }))
        ),
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
