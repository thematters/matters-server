import { connectionFromPromisedArray } from 'graphql-relay'
import { GQLRecommendationTypeResolver, Context } from 'definitions'

// TODO: use connectionFromPromisedArray to avoid overloading server

const resolvers: GQLRecommendationTypeResolver = {
  followeeArticles: async (
    { id },
    { input },
    { dataSources: { userService } }: Context
  ) => connectionFromPromisedArray(userService.followeeArticles(id), input),
  hottest: ({ id }, { input }, { dataSources: { articleService } }: Context) =>
    connectionFromPromisedArray(articleService.recommendHottest(), input),
  newest: ({ id }, { input }, { dataSources: { articleService } }: Context) =>
    connectionFromPromisedArray(articleService.recommendNewest(), input),
  icymi: ({ id }, { input }, { dataSources: { articleService } }: Context) =>
    connectionFromPromisedArray(articleService.recommendIcymi(), input),
  tags: ({ id }, { input }, { dataSources: { tagService } }) =>
    connectionFromPromisedArray(tagService.recommendTags(input), input),
  topics: ({ id }, { input }, { dataSources: { articleService } }: Context) =>
    connectionFromPromisedArray(articleService.recommendTopics(), input),
  authors: ({ id }, { input }, { dataSources: { userService } }: Context) =>
    connectionFromPromisedArray(userService.recommendAuthor(), input)
}

export default resolvers
