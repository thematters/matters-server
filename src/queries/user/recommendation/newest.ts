import type { GQLRecommendationResolvers } from 'definitions'

import { DEFAULT_TAKE_PER_PAGE } from 'common/enums'
import { ForbiddenError } from 'common/errors'
import { connectionFromPromisedArray, fromConnectionArgs } from 'common/utils'

export const newest: GQLRecommendationResolvers['newest'] = async (
  _,
  { input },
  { viewer, dataSources: { articleService, draftService } }
) => {
  const { oss = false } = input

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
  })

  return connectionFromPromisedArray(
    draftService.loadByIds(articles.map(({ draftId }) => draftId)),
    input,
    MAX_ITEM_COUNT // totalCount
  )
}
