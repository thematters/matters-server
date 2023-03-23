import _find from 'lodash/find.js'
import _isNil from 'lodash/isNil.js'

import { TagToCoverResolver } from 'definitions'

const resolver: TagToCoverResolver = async (
  { id, cover },
  _,
  { dataSources: { articleService, systemService, tagService } }
) => {
  let coverId = cover

  // fall back to first 10 article cover if tag has no cover
  if (!coverId) {
    const articleCover = _find(
      await tagService.findArticleCovers({ id }),
      (item) => !_isNil(item.cover)
    )
    coverId = articleCover?.cover
  }
  return coverId ? systemService.findAssetUrl(coverId) : null
}

export default resolver
