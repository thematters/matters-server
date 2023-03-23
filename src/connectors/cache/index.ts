import { RedisCache } from 'apollo-server-cache-redis'
import Redis from 'ioredis'
import _ from 'lodash'

import { CACHE_TTL } from 'common/enums/index.js'
import { environment } from 'common/environment.js'
import { UnknownError } from 'common/errors.js'

/**
 * Service for managing cache for other async services. Resolvers and middlewares
 * for GQL server should use it's own cache mechanism instead.
 *
 */

interface KeyInfo {
  type?: string
  id?: string
  args?: { [key: string]: any }
  field?: string
}

const redisCache = new RedisCache({
  host: environment.cacheHost,
  port: environment.cachePort,
})

export class CacheService {
  prefix: string
  redis: RedisCache

  constructor(prefix = '') {
    this.prefix = prefix
    this.redis = redisCache
  }

  /**
   * Generate cache key.
   *
   * e.g. cache-objects:Article:1510
   */
  genKey = ({ type, id, field, args }: KeyInfo): string => {
    const keys = [type, id, field, JSON.stringify(args)].filter((el) => el)
    if (keys.length === 0) {
      throw new UnknownError('cache key not specified')
    }
    return [this.prefix, ...keys].join(':')
  }

  /**
   * Store gql returned object in cache.
   */
  storeObject = ({
    keys,
    data,
    expire = CACHE_TTL.SHORT,
  }: {
    keys: KeyInfo
    data: any
    expire?: number
  }) => {
    if (!this.redis || !this.redis.client) {
      throw new Error('redis init failed')
    }

    const key = this.genKey(keys)
    const serializedData = JSON.stringify(data)

    return this.redis.client.set(key, serializedData, 'EX', expire)
  }

  /**
   * Get object from cache, or get object then cache.
   */
  getObject = async ({
    keys,
    getter,
    expire = CACHE_TTL.SHORT,
  }: KeyInfo & {
    keys: KeyInfo
    getter: () => Promise<any>
    expire?: number
  }) => {
    const isNil = (tested: any) => {
      if (_.isNil(tested)) {
        return true
      }

      // avoid empty object
      if (typeof tested === 'object') {
        // Object.values(new Date()).length === 0
        if (tested instanceof Date) {
          return false
        }
        return Object.values(tested).length === 0
      }

      return false
    }

    const key = this.genKey(keys)

    let data = await (this.redis.client as Redis.Redis).get(key)
    data = JSON.parse(data as string)

    // get the data if there is none
    if (isNil(data) && getter) {
      data = await getter()

      if (!isNil(data)) {
        this.storeObject({
          keys,
          data,
          expire,
        })
      }
    }

    return data
  }

  /**
   * Remvoe object from cache
   */
  removeObject = async ({
    keys,
  }: KeyInfo & {
    keys: KeyInfo
  }) => {
    const key = this.genKey(keys)
    await (this.redis.client as Redis.Redis).del(key)
  }
}
