import type { GQLArticleResolvers } from 'definitions'

const resolver: GQLArticleResolvers['license'] = async (
  { id },
  _,
  { dataSources: { articleService } }
) => {
  const articleVersion = await articleService.loadLatestArticleVersion(id)
  return articleVersion.license
}

export default resolver
