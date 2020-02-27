import { RedisCache } from 'apollo-server-cache-redis'

import { CACHE_PREFIX, CACHE_TTL } from 'common/enums'
import { environment } from 'common/environment'
import logger from 'common/logger'

/**
 * Service for managing cache for other async services. Resolvers and middlewares
 * for GQL server should use it's own cache mechanism instead.
 *
 */

export class CacheService {
  prefix: string
  redis: RedisCache

  constructor(instance?: RedisCache, prefix = CACHE_PREFIX.KEYS) {
    this.prefix = prefix
    this.redis = instance || this.init()
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
  genKey = (type: string, id: string, args?: string): string =>
    [this.prefix, type, id, args].filter(el => el).join(':')

  storeObject = ({
    type,
    id,
    args,
    data,
    expire = CACHE_TTL.SHORT
  }: {
    type: string
    id: string
    args?: string
    data: string
    expire?: number
  }) => {
    if (!this.redis || !this.redis.client) {
      throw new Error('redis init failed')
    }
    const key = this.genKey(type, id, args)
    return this.redis.client.set(key, data, 'EX', expire)
  }

  getObject = ({
    type,
    id,
    args
  }: {
    type: string
    id: string
    args?: string
  }) => {
    const key = this.genKey(type, id, args)
    return this.redis.client.get(key)
  }

  /**
   * Invalidate cache by given type and id.
   */
  invalidateFQC = async (type: string, id: string) => {
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
      logger.error(error)
    }
  }
}
