import type { GQLArticleResolvers } from 'definitions/index.js'

const resolver: GQLArticleResolvers['iscnId'] = async (
  { id },
  _,
  { dataSources: { articleService } }
) => {
  const articleVersion = await articleService.loadLatestArticleVersion(id)
  return articleVersion.iscnId || ''
}

export default resolver
