import { connectionFromPromisedArray } from 'graphql-relay'

import { GQLUserActivityTypeResolver } from 'definitions'

const resolver: GQLUserActivityTypeResolver = {
  history: async (
    { id },
    { input },
    { dataSources: { userService, articleService } }
  ) => {
    const readHistory = await userService.findReadHistory(id)

    const history = Promise.all(
      readHistory.map(async ({ uuid, articleId, createdAt }: any) => {
        const article = await articleService.dataloader.load(articleId)
        return {
          uuid,
          article,
          readAt: createdAt
        }
      })
    )

    return connectionFromPromisedArray(history, input)
  },
  recentSearches: async (
    { id },
    { input },
    { dataSources: { userService } }
  ) => {
    return connectionFromPromisedArray(userService.recentSearches(id), input)
  }
}

export default resolver
