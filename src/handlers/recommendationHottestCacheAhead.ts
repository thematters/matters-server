import { CACHE_PREFIX, CACHE_TTL } from '#common/enums/index.js'
import { environment } from '#common/environment.js'
import { Cache } from '#connectors/cache/index.js'
import { RecommendationService } from '#connectors/recommendationService.js'

import { connections } from '../connections.js'

export const handler = async () => {
  await connections.ensureConnected()
  const cache = new Cache(
    CACHE_PREFIX.RECOMMENDATION_HOTTEST,
    connections.objectCacheRedis
  )
  const recommendationService = new RecommendationService(connections)
  const articleIds = await recommendationService.findHottestArticles({
    days: environment.hottestArticlesDays,
    decayDays: environment.hottestArticlesDecayDays,
    HKDThreshold: environment.hottestArticlesHKDThreshold,
    USDTThreshold: environment.hottestArticlesUSDTThreshold,
    readWeight: environment.hottestArticlesReadWeight,
    commentWeight: environment.hottestArticlesCommentWeight,
    donationWeight: environment.hottestArticlesDonationWeight,
    readersThreshold: environment.hottestArticlesReadersThreshold,
    commentsThreshold: environment.hottestArticlesCommentsThreshold,
  })
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
