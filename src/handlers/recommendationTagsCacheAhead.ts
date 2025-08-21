import { CACHE_PREFIX, CACHE_TTL } from '#common/enums/index.js'
import { Cache } from '#connectors/cache/index.js'
import { RecommendationService } from '#connectors/recommendationService.js'

import { connections } from '../connections.js'

type Event = {
  data?: {
    channelId?: string
  }
}

export const handler = async (event: Event) => {
  await connections.ensureConnected()
  const channelId = event?.data?.channelId
  const cache = new Cache(
    CACHE_PREFIX.RECOMMENDATION_TAGS,
    connections.objectCacheRedis
  )
  const recommendationService = new RecommendationService(connections)
  const { query } = await recommendationService.recommendTags(channelId)
  const tags = await query.limit(50)
  await cache.storeObject({
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
