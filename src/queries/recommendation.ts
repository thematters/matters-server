import type { GQLResolvers } from 'definitions'

const recommendation: GQLResolvers = {
  IcymiTopic: {
    articles: async ({ articles }, _, { dataSources: { atomService } }) =>
      atomService.articleIdLoader.loadMany(articles),
    archivedAt: async ({ updatedAt }) => updatedAt,
  },
}

export default recommendation
