import {
  connectionFromPromisedArray,
  cursorToOffset,
  offsetToCursor
} from 'common/utils'
import { AuthenticationError } from 'apollo-server'
import { GQLRecommendationTypeResolver } from 'definitions'

// TODO: use connectionFromPromisedArray to avoid overloading server

const resolvers: GQLRecommendationTypeResolver = {
  followeeArticles: async (
    { id }: { id: string },
    { input },
    { dataSources: { userService } }
  ) => {
    if (!id) {
      throw new AuthenticationError('anonymous user cannot do this')
    }
    const { first, after } = input
    const offset = cursorToOffset(after) + 1
    const totalCount = await userService.countFolloweeArticles(id)
    return connectionFromPromisedArray(
      userService.followeeArticles({ userId: id, offset, limit: first }),
      input,
      {
        totalCount,
        mapToCursor: (_, index: number) => offsetToCursor(index + offset)
      }
    )
  },
  hottest: ({ id }, { input }, { dataSources: { articleService } }) =>
    connectionFromPromisedArray(articleService.recommendHottest(), input),
  newest: ({ id }, { input }, { dataSources: { articleService } }) =>
    connectionFromPromisedArray(articleService.recommendNewest(), input),
  icymi: ({ id }, { input }, { dataSources: { articleService } }) =>
    connectionFromPromisedArray(articleService.recommendIcymi(), input),
  tags: ({ id }, { input }, { dataSources: { tagService } }) =>
    connectionFromPromisedArray(tagService.recommendTags(), input),
  topics: ({ id }, { input }, { dataSources: { articleService } }) =>
    connectionFromPromisedArray(articleService.recommendTopics(), input),
  authors: ({ id }, { input }, { dataSources: { userService } }) =>
    connectionFromPromisedArray(userService.recommendAuthor(), input)
}

export default resolvers
