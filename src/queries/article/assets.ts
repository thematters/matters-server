import type { GQLArticleResolvers } from '#definitions/index.js'

import { extractAssetDataFromHtml } from '#common/utils/index.js'

const resolver: GQLArticleResolvers['assets'] = async (
  { id, authorId },
  _,
  { viewer, dataSources: { articleService, systemService } }
) => {
  // Check inside resolver instead of `@auth(mode: "${AUTH_MODE.oauth}")`
  // since `@auth` now only supports scope starting with `viewer`.
  const isAuthor = authorId === viewer.id
  if (!isAuthor) {
    const content = await articleService.loadLatestArticleContent(id)
    const images = extractAssetDataFromHtml(content, 'image')
    if (images.length > 0) {
      return systemService.findAssetByUUIDs(images.slice(0, 1))
    } else {
      return []
    }
  }

  // assets belonged to this article
  const { id: articleEntityTypeId } = await systemService.baseFindEntityTypeId(
    'article'
  )
  return systemService.findAssetAndAssetMap({
    entityTypeId: articleEntityTypeId,
    entityId: id,
  })
}

export default resolver
