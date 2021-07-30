import { SchemaDirectiveVisitor } from '@graphql-tools/utils'
import { defaultFieldResolver, GraphQLField } from 'graphql'
import Redis from 'ioredis'

import { CACHE_PREFIX } from 'common/enums'
import { ActionLimitExceededError } from 'common/errors'
import { CacheService } from 'connectors'

const checkOperationLimit = async ({
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
  const cacheService = new CacheService(CACHE_PREFIX.OPERATION_LOG)

  const cacheKey = cacheService.genKey({
    id: user,
    field: operation,
  })

  const redisClient = cacheService.redis.client as Redis.Redis

  const operationLog = await redisClient.lrange(cacheKey, 0, -1)

  // timestamp in seconds
  const current = Math.floor(Date.now() / 1000)

  // no record
  if (!operationLog) {
    // create
    redisClient.lpush(cacheKey, current).then(() => {
      redisClient.expire(cacheKey, period)
    })

    // pass
    return true
  }

  // within period
  const valid = operationLog.map(
    (timestamp) => parseInt(timestamp, 10) >= current - period
  )

  // count
  const times: number = valid.reduce<any>(
    (a: boolean, b: boolean) => (a ? 1 : 0) + (b ? 1 : 0),
    0
  )

  // over limit
  if (times >= limit) {
    return false
  }

  // add, trim, update expiration
  redisClient.lpush(cacheKey, current)
  redisClient.ltrim(cacheKey, 0, times)
  redisClient.expire(cacheKey, period)

  // pass
  return true
}

export class RateLimitDirective extends SchemaDirectiveVisitor {
  public visitFieldDefinition(field: GraphQLField<any, any>) {
    const { resolve = defaultFieldResolver, name } = field
    const { limit, period } = this.args

    field.resolve = async function (...args) {
      const [, , { viewer }] = args

      const pass = await checkOperationLimit({
        user: viewer.id || viewer.ip,
        operation: name,
        limit,
        period,
      })

      if (!pass) {
        throw new ActionLimitExceededError(
          `rate exceeded for operation ${name}`
        )
      }

      return resolve.apply(this, args)
    }
  }
}
