import type { GQLArticleResolvers } from 'definitions'

const resolver: GQLArticleResolvers['title'] = async (
  { id },
  _,
  { dataSources: { articleService } }
) => {
  const articleVersion = await articleService.loadLatestArticleVersion(id)
  return articleVersion.title || ''
}

export default resolver
