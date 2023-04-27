import _find from 'lodash/find'
import _isNil from 'lodash/isNil'

import { isTarget } from 'common/utils'
import { TagToCoverResolver } from 'definitions'

const resolver: TagToCoverResolver = async (
  { id, cover },
  _,
  { dataSources: { articleService, systemService, tagService }, req, viewer }
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
  return coverId
    ? systemService.findAssetUrl(coverId, !isTarget(req, viewer))
    : null
}

export default resolver
