import type { Redis } from 'ioredis'

import { CACHE_PREFIX } from 'common/enums'
import { genCacheKey } from 'connectors'

export const checkOperationLimit = async ({
  user,
  operation,
  limit,
  period,
  redis,
}: {
  user: string
  operation: string
  limit: number
  period: number
  redis: Redis
}) => {
  const cacheKey = genCacheKey({
    id: user,
    field: operation,
    prefix: CACHE_PREFIX.OPERATION_LOG,
  })

  const operationLog = await redis.lrange(cacheKey, 0, -1)

  // timestamp in seconds
  const current = Math.floor(Date.now() / 1000)

  // no record
  if (!operationLog) {
    // create
    redis.lpush(cacheKey, current).then(() => {
      redis.expire(cacheKey, period)
    })

    // pass
    return true
  }

  // count times within period
  const cutoff = current - period
  let times = 0
  for (const timestamp of operationLog) {
    if (parseInt(timestamp, 10) >= cutoff) {
      times += 1
    } else {
      break
    }
  }

  // over limit
  if (times >= limit) {
    return false
  }

  // add, trim, update expiration
  redis.lpush(cacheKey, current)
  redis.ltrim(cacheKey, 0, times)
  redis.expire(cacheKey, period)

  // pass
  return true
}
