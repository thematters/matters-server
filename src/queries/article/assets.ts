import type { GQLArticleResolvers } from '#definitions/index.js'

import { getLogger } from '#common/logger.js'
import { extractAssetDataFromHtml } from '#common/utils/index.js'
import compact from 'lodash/compact.js'

const logger = getLogger('resolver-article-assets')

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
      const res = compact(await systemService.findAssetByUUIDs(images))
      if (res.length === 0) {
        logger.warn(`No assets ${images[0]} not found in database`)
      }
      return res
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
