import type { GQLTagResolvers } from 'definitions'

import _find from 'lodash/find'
import _isNil from 'lodash/isNil'

const resolver: GQLTagResolvers['cover'] = async (
  { id, cover },
  _,
  { dataSources: { systemService, tagService } }
) => {
  let coverId = cover

  // fall back to first 10 article cover if tag has no cover
  if (!coverId) {
    const articleCover = _find(
      await tagService.findArticleCovers({ id }),
      (item) => !_isNil(item.cover)
    )
    coverId = articleCover?.cover ?? null
  }
  return coverId ? systemService.findAssetUrl(coverId) : null
}

export default resolver
