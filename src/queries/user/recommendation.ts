import { GQLRecommendationTypeResolver, Context } from 'definitions'

const resolvers: GQLRecommendationTypeResolver = {
  followeeArticles: async (
    { id },
    { input },
    { dataSources: { articleService } }: Context
  ) => articleService.followeeArticles(input),
  hottest: ({ id }, { input }, { dataSources: { articleService } }: Context) =>
    articleService.recommendHottest(input),
  icymi: ({ id }, { input }, { dataSources: { articleService } }: Context) =>
    articleService.recommendIcymi(input),
  // tags(input: ListInput!): [Tag!]
  topics: ({ id }, { input }, { dataSources: { articleService } }: Context) =>
    articleService.recommendTopics(input)
  // authors(input: ListInput!): [User!]!
}

export default resolvers
