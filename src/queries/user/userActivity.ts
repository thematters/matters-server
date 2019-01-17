import { connectionFromPromisedArray, cursorToIndex } from 'common/utils'

import { GQLUserActivityTypeResolver } from 'definitions'

const resolver: GQLUserActivityTypeResolver = {
  history: async (
    { id },
    { input },
    { dataSources: { userService, articleService } }
  ) => {
    const { first, after } = input
    const offset = cursorToIndex(after) + 1
    const totalCount = await userService.countReadHistory(id)
    const readHistory = await userService.findReadHistory({
      userId: id,
      offset,
      limit: first
    })

    return connectionFromPromisedArray(
      Promise.all(
        readHistory.map(async ({ uuid, articleId, createdAt }: any) => {
          const article = await articleService.dataloader.load(articleId)
          return {
            uuid,
            article,
            readAt: createdAt
          }
        })
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
    return connectionFromPromisedArray(
      userService.findRecentSearches(id),
      input
    )
  }
}

export default resolver
