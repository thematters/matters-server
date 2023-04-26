import _find from 'lodash/find'
import _isNil from 'lodash/isNil'

import { TagToCoverResolver } from 'definitions'

const resolver: TagToCoverResolver = async (
  { id, cover },
  _,
  { dataSources: { articleService, systemService, tagService }, req }
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
  const useS3 = ![
    'https://web-develop.matters.town',
    'https://web-next.matters.town',
  ].includes(req.headers.origin as string)
  return coverId ? systemService.findAssetUrl(coverId, useS3) : null
}

export default resolver
