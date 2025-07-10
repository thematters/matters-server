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
  const uuids = extractAssetDataFromHtml(content, 'image')

  if (uuids.length > 0) {
    const [asset] = await systemService.findAssetByUUIDs(uuids.slice(0, 1))
    if (asset && asset.id) {
      return systemService.findAssetUrl(asset.id)
    }
  }

  return null
}

export default resolver
