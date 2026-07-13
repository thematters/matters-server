import type { Redis, Cluster } from 'ioredis'

import { CACHE_TTL } from '#common/enums/index.js'
import { UnknownError } from '#common/errors.js'
import _ from 'lodash'

/**
 * Service for managing cache for other async services. Resolvers and middlewares
 * for GQL server should use it's own cache mechanism instead.
 *
 */

interface KeyInfo {
  type?: string
  id?: string
  args?: { [key: string]: unknown }
  field?: string
}

export const genCacheKey = ({
  type,
  id,
  field,
  args,
  prefix,
}: KeyInfo & { prefix: string }): string => {
  const keys = [type, id, field, JSON.stringify(args)].filter((el) => el)
  if (keys.length === 0) {
    throw new UnknownError('cache key not specified')
  }
  return [prefix, ...keys].join(':')
}

export class Cache {
  private prefix: string
  private redis: Redis | Cluster

  public constructor(prefix: string, redis: Redis | Cluster) {
    this.prefix = prefix
    this.redis = redis
  }

  /**
   * Generate cache key.
   *
   * e.g. cache-objects:Article:1510
   */
  public genKey = ({ type, id, field, args }: KeyInfo): string =>
    genCacheKey({ type, id, field, args, prefix: this.prefix })

  /**
   * Store gql returned object in cache.
   */
  public storeObject = async ({
    keys,
    data,
    expire = CACHE_TTL.SHORT,
  }: {
    keys: KeyInfo
    data: unknown
    expire?: number
  }) => {
    if (!this.redis) {
      throw new Error('cache backend init failed')
    }

    const key = this.genKey(keys)
    const serializedData = JSON.stringify(data)

    return this.redis.set(key, serializedData, 'EX', expire)
  }

  /**
   * Get object from cache, or get object then cache.
   */
  public getObject = async <T>({
    keys,
    getter,
    expire = CACHE_TTL.SHORT,
  }: KeyInfo & {
    keys: KeyInfo
    getter: () => Promise<T>
    expire?: number
  }): Promise<T> => {
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

    const raw = await this.redis.get(key)
    let data = JSON.parse(raw as string) as unknown as T

    // get the data if there is none
    if (isNil(data) && getter) {
      data = await getter()

      if (!isNil(data)) {
        await this.storeObject({
          keys,
          data,
          expire,
        })
      }
    }

    return data
  }

  /**
   * Get object from cache; on miss return null immediately and trigger a
   * single-flight background recompute so the request never runs the getter.
   */
  public getObjectOrWarm = async <T>({
    keys,
    getter,
    expire = CACHE_TTL.SHORT,
  }: {
    keys: KeyInfo
    getter: () => Promise<T>
    expire?: number
  }): Promise<T | null> => {
    const key = this.genKey(keys)

    const raw = await this.redis.get(key)
    if (raw !== null) {
      return JSON.parse(raw) as T
    }

    // miss: never block the request, try to become the sole warmer.
    // 300s auto-expire is a fallback longer than the slowest recompute.
    const lockKey = `${key}:warm-lock`
    const locked = await this.redis.set(lockKey, '1', 'EX', 300, 'NX')
    if (locked === 'OK') {
      // fire-and-forget; warm() swallows all errors so it never rejects
      this.warm({ key, lockKey, keys, getter, expire }).catch(() => undefined)
    }

    return null
  }

  private warm = async <T>({
    key,
    lockKey,
    keys,
    getter,
    expire,
  }: {
    key: string
    lockKey: string
    keys: KeyInfo
    getter: () => Promise<T>
    expire: number
  }): Promise<void> => {
    try {
      // re-check to avoid recompute if another writer already filled it
      const raw = await this.redis.get(key)
      if (raw !== null) {
        return
      }
      const data = await getter()
      if (!this.isNilOrEmpty(data)) {
        await this.storeObject({ keys, data, expire })
      }
    } catch {
      // silent by request: no logger yet
    } finally {
      try {
        await this.redis.del(lockKey)
      } catch {
        // silent by request: no logger yet
      }
    }
  }

  // same emptiness check as getObject, extracted for warm()
  private isNilOrEmpty = (tested: any): boolean => {
    if (_.isNil(tested)) {
      return true
    }

    // avoid empty object
    if (typeof tested === 'object') {
      if (tested instanceof Date) {
        return false
      }
      return Object.values(tested).length === 0
    }

    return false
  }

  /**
   * Remove object from cache
   */
  public removeObject = async ({
    keys,
  }: KeyInfo & {
    keys: KeyInfo
  }) => {
    const key = this.genKey(keys)
    await this.redis.del(key)
  }
}
