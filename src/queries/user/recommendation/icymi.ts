import type { Article, GQLRecommendationResolvers } from '#definitions/index.js'

import { CACHE_PREFIX, CACHE_TTL } from '#common/enums/index.js'
import { connectionFromArray, fromConnectionArgs } from '#common/utils/index.js'
import { Cache } from '#connectors/index.js'

export const icymi: GQLRecommendationResolvers['icymi'] = async (
  _,
  { input },
  {
    dataSources: {
      recommendationService,
      connections: { objectCacheRedis },
    },
  }
) => {
  const { take, skip } = fromConnectionArgs(input)
  const cache = new Cache(CACHE_PREFIX.RECOMMENDATION_ICYMI, objectCacheRedis)
  const keys = { type: 'recommendationIcymi', args: { take, skip } }
  const cacheKey = cache.genKey(keys)
  const raw = await objectCacheRedis.get(cacheKey)
  let cached = raw
    ? (JSON.parse(raw) as { articles: Article[]; totalCount: number })
    : undefined

  if (!cached) {
    const lockKey = `${cacheKey}:lock`
    const acquired = await objectCacheRedis.set(lockKey, '1', 'EX', 60, 'NX')
    if (acquired) {
      try {
        try {
          const [queryArticles, queryTotalCount] =
            await recommendationService.findIcymiArticles({
              take,
              skip,
            })
          cached = { articles: queryArticles, totalCount: queryTotalCount }
        } catch {
          cached = { articles: [], totalCount: 0 }
        }
        await cache.storeObject({
          keys,
          data: cached,
          expire: CACHE_TTL.PUBLIC_FEED_ARTICLE,
        })
      } finally {
        await objectCacheRedis.del(lockKey)
      }
    } else {
      cached = { articles: [], totalCount: 0 }
    }
  }

  const { articles, totalCount } = cached
  return connectionFromArray(articles, input, totalCount)
}
