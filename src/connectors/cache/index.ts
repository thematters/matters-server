import { RedisCache } from 'apollo-server-cache-redis'
import _ from 'lodash'

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
    type?: string
    id: string
    args?: string
    field?: string
  }): string =>
    [this.prefix, type, id, field, args].filter((el) => el).join(':')

  /**
   * Store gql returned object in cache.
   */
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
    const serializedData = JSON.stringify(data)

    return this.redis.client.set(key, serializedData, 'EX', expire)
  }

  /**
   * Get object from cache, or get object then cache.
   */
  getObject = async ({
    type,
    id,
    field,
    args,
    getter,
    expire = CACHE_TTL.SHORT,
  }: {
    type: string
    id: string
    field?: string
    args?: string
    getter?: () => Promise<string | undefined>
    expire?: number
  }) => {
    const key = this.genKey({ type, id, field, args })

    let data = await this.redis.client.get(key)
    data = JSON.parse(data)

    // get the data if there is none
    if (_.isNil(data) && getter) {
      data = await getter()

      if (!_.isNil(data)) {
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

    return data
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

  checkOperationLimit = async ({
    user,
    operation,
    limit,
    period,
  }: {
    user: string
    operation: string
    limit: number
    period: number
  }) => {
    const cacheKey = this.genKey({
      id: user,
      field: operation,
    })

    const operationLog = await this.redis.client.lrange(cacheKey, 0, -1)

    // timestamp in seconds
    const current = Math.floor(Date.now() / 1000)

    // no record
    if (!operationLog) {
      // create
      this.redis.client.lpush(cacheKey, current).then(() => {
        this.redis.client.expire(cacheKey, period)
      })

      // pass
      return true
    }

    // within period
    const valid = operationLog.map(
      (timestamp: number) => timestamp >= current - period
    )

    // count
    const times = valid.reduce(
      (a: boolean, b: boolean) => (a ? 1 : 0) + (b ? 1 : 0),
      0
    )

    // over limit
    if (times >= limit) {
      return false
    }

    // add, trim, update expiration
    this.redis.client.lpush(cacheKey, current)
    this.redis.client.ltrim(cacheKey, 0, times)
    this.redis.client.expire(cacheKey, period)

    // pass
    return true
  }
}
