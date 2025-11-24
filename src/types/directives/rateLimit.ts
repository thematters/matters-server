import type { Redis } from 'ioredis'

import { CACHE_PREFIX } from '#common/enums/index.js'
import { ActionLimitExceededError } from '#common/errors.js'
import { getLogger } from '#common/logger.js'
import { genCacheKey } from '#connectors/index.js'
import { mapSchema, getDirective, MapperKind } from '@graphql-tools/utils'
import { defaultFieldResolver, GraphQLSchema } from 'graphql'

const logger = getLogger('ratelimit')

const checkOperationLimit = async ({
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

export const rateLimitDirective = (directiveName = 'rateLimit') => ({
  typeDef: `"Rate limit within a given period of time, in seconds"
directive @${directiveName}(period: Int!, limit: Int!, ip: Boolean) on FIELD_DEFINITION`,

  transformer: (schema: GraphQLSchema) => {
    return mapSchema(schema, {
      [MapperKind.OBJECT_FIELD]: (fieldConfig, fieldName) => {
        const directive = getDirective(schema, fieldConfig, directiveName)?.[0]

        if (directive) {
          const { resolve = defaultFieldResolver } = fieldConfig
          const { limit, period, ip } = directive
          fieldConfig.resolve = async (source, args, context, info) => {
            const { viewer } = context

            const user = ip ? viewer.ip : viewer.id || viewer.ip

            logger.debug(user)

            const pass = await checkOperationLimit({
              user,
              operation: fieldName,
              limit,
              period,
              redis: context.dataSources.connections.redis,
            })

            if (!pass) {
              throw new ActionLimitExceededError(
                `rate exceeded for operation ${fieldName}`
              )
            }

            return await resolve(source, args, context, info)
          }
          return fieldConfig
        }
      },
    })
  },
})
