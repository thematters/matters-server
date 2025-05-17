import { CACHE_PREFIX, CACHE_TTL } from '#common/enums/index.js'
import { RecommendationService, CacheService } from '#connectors/index.js'

import { connections } from '../routes/connections.js'

type Event = {
  data?: {
    channelId?: string
  }
}

export const handler = async (event: Event) => {
  const channelId = event?.data?.channelId
  const cacheService = new CacheService(
    CACHE_PREFIX.RECOMMENDATION_AUTHORS,
    connections.objectCacheRedis
  )
  const recommendationService = new RecommendationService(connections)
  const { query } = await recommendationService.recommendTags(channelId)
  const tags = await query.limit(50)
  await cacheService.storeObject({
    keys: {
      type: 'recommendationTags',
      args: {
        channelId,
      },
    },
    data: tags,
    expire: CACHE_TTL.LONG,
  })
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Recommendation tags cached',
    }),
  }
}
