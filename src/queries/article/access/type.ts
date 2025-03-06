import type { GQLArticleAccessResolvers } from 'definitions/index.js'

export const type: GQLArticleAccessResolvers['type'] = async (
  { id },
  _,
  { dataSources: { articleService } }
) => articleService.getAccess(id)
