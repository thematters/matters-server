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
  const channelId = event?.data?.channelId
  const cache = new Cache(
    CACHE_PREFIX.RECOMMENDATION_AUTHORS,
    connections.objectCacheRedis
  )
  const recommendationService = new RecommendationService(connections)
  const { query } = await recommendationService.recommendAuthors(channelId)
  const authors = await query
  await cache.storeObject({
    keys: {
      type: 'recommendationAuthors',
      args: {
        channelId,
      },
    },
    data: authors,
    expire: CACHE_TTL.LONG,
  })
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Recommendation authors cached',
    }),
  }
}
