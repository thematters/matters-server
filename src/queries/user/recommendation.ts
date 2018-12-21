import { GQLRecommendationTypeResolver, Context } from 'definitions'

const resolvers: GQLRecommendationTypeResolver = {
  hottest: ({ id }, { input }, { articleService }: Context) =>
    articleService.recommendHottest(input),
  icymi: ({ id }, { input }, { articleService }: Context) =>
    articleService.recommendIcymi(input),
  // tags(input: ListInput!): [Tag!]
  topics: ({ id }, { input }, { articleService }: Context) =>
    articleService.recommendTopics(input)
  // authors(input: ListInput!): [User!]!
}

export default resolvers
