import type { GQLRecommendationResolvers } from '#definitions/index.js'

import { CACHE_PREFIX, CACHE_TTL } from '#common/enums/index.js'
import { environment } from '#common/environment.js'
import { connectionFromArray, fromConnectionArgs } from '#common/utils/index.js'
import { Cache } from '#connectors/index.js'

export const hottestMoments: GQLRecommendationResolvers['hottestMoments'] =
  async (
    _,
    { input },
    {
      viewer,
      dataSources: {
        atomService,
        recommendationService,
        systemService,
        connections: { objectCacheRedis },
      },
    }
  ) => {
    const feature = await systemService.getFeatureFlag('hottest_moment_feed')
    const enabled =
      feature && (await systemService.isFeatureEnabled(feature.flag, viewer))
    if (!enabled) {
      return connectionFromArray([], input, 0)
    }

    const { take, skip } = fromConnectionArgs(input)

    const cache = new Cache(
      CACHE_PREFIX.RECOMMENDATION_HOTTEST_MOMENTS,
      objectCacheRedis
    )
    const momentIds = await cache.getObject({
      keys: { type: 'recommendationHottestMoments' },
      getter: async () =>
        recommendationService.findHottestMoments({
          days: environment.hottestMomentsDays,
          decayDays: environment.hottestMomentsDecayDays,
          likeWeight: environment.hottestMomentsLikeWeight,
          commentWeight: environment.hottestMomentsCommentWeight,
          likesThreshold: environment.hottestMomentsLikesThreshold,
          commentsThreshold: environment.hottestMomentsCommentsThreshold,
          maxTake: environment.hottestMomentsMaxTake,
        }),
      expire: CACHE_TTL.LONG,
    })

    const moments = await atomService.momentIdLoader.loadMany(
      momentIds.slice(skip, skip + take).map(({ momentId }) => momentId)
    )

    return connectionFromArray(moments, input, momentIds.length)
  }
