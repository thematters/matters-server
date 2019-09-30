import { RedisCache } from 'apollo-server-cache-redis'

import { CACHE_PREFIX } from 'common/enums'
import { environment } from 'common/environment'

/**
 * Service for managing cache for other async services. Resolvers and middlewares
 * for GQL server should use it's own cache mechanism instead.
 *
 */

export class CacheService {
  prefix: string
  redis: RedisCache

  constructor() {
    this.prefix = CACHE_PREFIX
    this.redis = this.init()
  }

  /**
   * Initialization of RedisCache.
   */
  init = (): RedisCache =>
    new RedisCache({
      host: environment.cacheHost,
      port: environment.cachePort
    })

  /**
   * Generate cache key.
   *
   * e.g. cache-keys:Article:1510
   */
  genKey = (type: string, id: string): string => `${this.prefix}:${type}:${id}`

  /**
   * Invalidate cache by given type and id.
   */
  invalidate = async (type: string, id: string) => {
    try {
      if (!this.redis || !this.redis.client) {
        throw new Error('redis init failed')
      }
      const key = this.genKey(type, id)
      const hashes = await this.redis.client.smembers(key)
      hashes.map(async (hash: string) => {
        await this.redis.client
          .pipeline()
          .del(`fqc:${hash}`)
          .srem(key, hash)
          .exec()
      })
    } catch (error) {
      console.error(error)
    }
  }
}
