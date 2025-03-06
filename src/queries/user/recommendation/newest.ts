import type { GQLRecommendationResolvers } from '#definitions/index.js'

import { DEFAULT_TAKE_PER_PAGE } from '#common/enums/index.js'
import { ForbiddenError } from '#common/errors.js'
import {
  connectionFromPromisedArray,
  fromConnectionArgs,
} from '#common/utils/index.js'

export const newest: GQLRecommendationResolvers['newest'] = async (
  _,
  { input },
  { viewer, dataSources: { articleService } }
) => {
  const { oss = false, excludeChannelArticles = false } = input

  if (oss) {
    if (!viewer.hasRole('admin')) {
      throw new ForbiddenError('only admin can access oss')
    }
  }
  const { take, skip } = fromConnectionArgs(input)

  const MAX_ITEM_COUNT = DEFAULT_TAKE_PER_PAGE * 50

  const articles = await articleService.latestArticles({
    take,
    skip,
    maxTake: MAX_ITEM_COUNT,
    oss,
    excludeSpam: true,
    excludeChannelArticles,
  })

  return connectionFromPromisedArray(
    articles,
    input,
    MAX_ITEM_COUNT // totalCount
  )
}
