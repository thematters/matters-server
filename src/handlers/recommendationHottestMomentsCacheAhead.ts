import type { APIGatewayProxyResult } from 'aws-lambda'

import { CACHE_PREFIX, CACHE_TTL, FEATURE_FLAG } from '#common/enums/index.js'
import { environment } from '#common/environment.js'
import { Cache } from '#connectors/cache/index.js'
import { RecommendationService } from '#connectors/recommendationService.js'
import { SystemService } from '#connectors/systemService.js'

import { connections } from '../connections.js'

export const handler = async (): Promise<APIGatewayProxyResult> => {
  await connections.ensureConnected()

  const systemService = new SystemService(connections)
  const feature = await systemService.getFeatureFlag('hottest_moment_feed')
  if (!feature || feature.flag === FEATURE_FLAG.off) {
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'hottest moment feed disabled, cache ahead skipped',
      }),
    }
  }

  const cache = new Cache(
    CACHE_PREFIX.RECOMMENDATION_HOTTEST_MOMENTS,
    connections.objectCacheRedis
  )
  const recommendationService = new RecommendationService(connections)
  const momentIds = await recommendationService.findHottestMoments({
    days: environment.hottestMomentsDays,
    decayDays: environment.hottestMomentsDecayDays,
    likeWeight: environment.hottestMomentsLikeWeight,
    commentWeight: environment.hottestMomentsCommentWeight,
    likesThreshold: environment.hottestMomentsLikesThreshold,
    commentsThreshold: environment.hottestMomentsCommentsThreshold,
    maxTake: environment.hottestMomentsMaxTake,
  })

  await cache.storeObject({
    keys: { type: 'recommendationHottestMoments' },
    data: momentIds,
    expire: CACHE_TTL.LONG,
  })

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Recommendation hottest moments cached',
    }),
  }
}
