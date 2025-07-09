import type { GQLArticleResolvers } from '#definitions/index.js'

import { extractAssetDataFromHtml } from '#common/utils/index.js'

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

  // If no cover, get the first image from article content
  const content = await articleService.loadLatestArticleContent(id)
  const images = extractAssetDataFromHtml(content, 'image')

  if (images.length > 0) {
    const assets = await systemService.findAssetByUUIDs([images[0]])
    if (assets && assets.length > 0) {
      return systemService.findAssetUrl(assets[0].id)
    }
  }

  return null
}

export default resolver
