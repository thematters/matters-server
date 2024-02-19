import type { GQLArticleResolvers } from 'definitions'

const resolver: GQLArticleResolvers['createdAt'] = async ({ createdAt }) => {
  return createdAt
}

export default resolver
