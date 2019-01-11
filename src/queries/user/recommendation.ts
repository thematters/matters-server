import { connectionFromPromisedArray } from 'graphql-relay'
import { GQLRecommendationTypeResolver } from 'definitions'

// TODO: use connectionFromPromisedArray to avoid overloading server

const resolvers: GQLRecommendationTypeResolver = {
  followeeArticles: async (
    { id },
    { input },
    { dataSources: { userService } }
  ) => connectionFromPromisedArray(userService.followeeArticles(id), input),
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
