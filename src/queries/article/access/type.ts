import type { GQLArticleAccessResolvers } from 'definitions'

export const type: GQLArticleAccessResolvers['type'] = async (
  { id },
  _,
  { dataSources: { articleService } }
) => articleService.getAccess(id)
