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
      port: environment.cachePort,
    })

  /**
   * Generate cache key.
   *
   * e.g. cache-keys:Article:1510
   */
  genKey = ({
    type,
    id,
    field,
    args,
  }: {
    type: string
    id: string
    args?: string
    field?: string
  }): string =>
    [this.prefix, type, id, field, args].filter((el) => el).join(':')

  storeObject = ({
    type,
    id,
    field,
    args,
    data,
    expire = CACHE_TTL.SHORT,
  }: {
    type: string
    id: string
    field?: string
    args?: string
    data: string
    expire?: number
  }) => {
    if (!this.redis || !this.redis.client) {
      throw new Error('redis init failed')
    }
    const key = this.genKey({ type, id, args, field })
    return this.redis.client.set(key, data, 'EX', expire)
  }

  getObject = async ({
    type,
    id,
    field,
    args,
    getter,
    fallbackValue = '',
    expire = CACHE_TTL.SHORT,
  }: {
    type: string
    id: string
    field?: string
    args?: string
    getter?: () => Promise<string | undefined>
    fallbackValue?: string
    expire?: number
  }) => {
    const key = this.genKey({ type, id, field, args })

    let data = await this.redis.client.get(key)

    // get the data if there is none
    if (!data && getter) {
      data = await getter()
      if (data) {
        this.storeObject({
          type,
          id,
          field,
          args,
          data,
          expire,
        })
      }
    }

    return data || fallbackValue
  }

  /**
   * Invalidate cache by given type and id.
   */
  invalidateFQC = async (type: string, id: string) => {
    try {
      if (!this.redis || !this.redis.client) {
        throw new Error('redis init failed')
      }
      const key = this.genKey({ type, id })
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
