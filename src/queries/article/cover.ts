import type { GQLArticleResolvers } from 'definitions'

const resolver: GQLArticleResolvers['cover'] = async (
  { id },
  _,
  { dataSources: { articleService, systemService } }
) => {
  const articleVersion = await articleService.loadLatestArticleVersion(id)
  return articleVersion.cover
    ? systemService.findAssetUrl(articleVersion.cover)
    : null
}

export default resolver
