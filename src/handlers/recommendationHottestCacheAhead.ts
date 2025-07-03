import {
  CACHE_PREFIX,
  CACHE_TTL,
  RECOMMENDATION_HOTTEST_DAYS,
  RECOMMENDATION_HOTTEST_MAX_TAKE,
} from '#common/enums/index.js'
import { Cache } from '#connectors/cache/index.js'
import { RecommendationService } from '#connectors/recommendationService.js'

import { connections } from '../connections.js'

export const handler = async () => {
  const cache = new Cache(
    CACHE_PREFIX.RECOMMENDATION_HOTTEST,
    connections.objectCacheRedis
  )
  const recommendationService = new RecommendationService(connections)
  const { query } = await recommendationService.findHottestArticles({
    days: RECOMMENDATION_HOTTEST_DAYS,
  })
  const articleIds = await query.limit(RECOMMENDATION_HOTTEST_MAX_TAKE)
  await cache.storeObject({
    keys: {
      type: 'recommendationHottest',
    },
    data: articleIds,
    expire: CACHE_TTL.LONG,
  })
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Recommendation hottest cached',
    }),
  }
}
