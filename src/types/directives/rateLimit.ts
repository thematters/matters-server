import { defaultFieldResolver, GraphQLField } from 'graphql'
import { SchemaDirectiveVisitor } from 'graphql-tools'

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

  const operationLog = await cacheService.redis.client.lrange(cacheKey, 0, -1)

  // timestamp in seconds
  const current = Math.floor(Date.now() / 1000)

  // no record
  if (!operationLog) {
    // create
    cacheService.redis.client.lpush(cacheKey, current).then(() => {
      cacheService.redis.client.expire(cacheKey, period)
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
  cacheService.redis.client.lpush(cacheKey, current)
  cacheService.redis.client.ltrim(cacheKey, 0, times)
  cacheService.redis.client.expire(cacheKey, period)

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
