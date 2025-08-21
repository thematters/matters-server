import type { GQLArticleResolvers } from '#definitions/index.js'

const resolver: GQLArticleResolvers['displayCover'] = async (
  { id },
  _,
  { dataSources: { articleService, systemService } }
) => {
  // First check if there's a cover
  const articleVersion = await articleService.loadLatestArticleVersion(id)
  if (articleVersion.cover) {
    return systemService.findAssetUrl(articleVersion.cover)
  }
  return null
}

export default resolver
