import type { GQLArticleResolvers } from 'definitions/index.js'

const resolver: GQLArticleResolvers['title'] = async (
  { id },
  _,
  { dataSources: { articleService } }
) => {
  const articleVersion = await articleService.loadLatestArticleVersion(id)
  return articleVersion.title || ''
}

export default resolver
