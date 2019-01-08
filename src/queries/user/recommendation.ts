import { GQLRecommendationTypeResolver, Context } from 'definitions'

const resolvers: GQLRecommendationTypeResolver = {
  followeeArticles: async (
    { id },
    { input },
    { dataSources: { userService } }: Context
  ) => userService.followeeArticles({ id, ...input }),
  hottest: ({ id }, { input }, { dataSources: { articleService } }: Context) =>
    articleService.recommendHottest(input),
  newest: ({ id }, { input }, { dataSources: { articleService } }: Context) =>
    articleService.recommendNewest(input),
  icymi: ({ id }, { input }, { dataSources: { articleService } }: Context) =>
    articleService.recommendIcymi(input),
  tags: ({ id }, { input }, { dataSources: { tagService } }: Context) =>
    tagService.recommendTags(input),
  topics: ({ id }, { input }, { dataSources: { articleService } }: Context) =>
    articleService.recommendTopics(input),
  authors: ({ id }, { input }, { dataSources: { userService } }: Context) =>
    userService.recommendAuthor(input)
}

export default resolvers
