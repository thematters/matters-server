import type { GQLArticleResolvers } from '#definitions/index.js'

const resolver: GQLArticleResolvers['createdAt'] = async ({ createdAt }) => {
  return createdAt
}

export default resolver
