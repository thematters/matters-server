import type { GQLRecommendationResolvers } from '#definitions/index.js'

import {
  DEFAULT_TAKE_PER_PAGE,
  USER_FEATURE_FLAG_TYPE,
} from '#common/enums/index.js'
import { ForbiddenError } from '#common/errors.js'
import { connectionFromQuery } from '#common/utils/index.js'

export const newest: GQLRecommendationResolvers['newest'] = async (
  _,
  { input },
  { viewer, dataSources: { articleService, systemService, userService } }
) => {
  const { oss = false, excludeChannelArticles = false } = input

  // determine maxTake, oss or user with unlimitedArticleFetch feature flag can fetch all articles
  let maxTake: number | undefined = DEFAULT_TAKE_PER_PAGE * 50
  if (oss) {
    if (!viewer.hasRole('admin')) {
      throw new ForbiddenError('only admin can access oss')
    }
    maxTake = undefined
  } else if (viewer.id) {
    const featureFlags = await userService.findFeatureFlags(viewer.id)
    if (
      featureFlags
        .map(({ type }) => type)
        .includes(USER_FEATURE_FLAG_TYPE.unlimitedArticleFetch)
    ) {
      maxTake = undefined
    }
  }

  const spamThreshold = await systemService.getSpamThreshold()
  const query = articleService.findNewestArticles({
    spamThreshold: spamThreshold ?? undefined,
    excludeChannelArticles,
    excludeExclusiveCampaignArticles: excludeChannelArticles,
  })

  return connectionFromQuery({
    query,
    orderBy: { column: 'id', order: 'desc' },
    args: input,
    cursorColumn: oss ? undefined : 'id',
    maxTake,
  })
}
