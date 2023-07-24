import { mapSchema, getDirective, MapperKind } from '@graphql-tools/utils'
import { defaultFieldResolver, GraphQLSchema } from 'graphql'

import { CACHE_PREFIX } from 'common/enums'
import { ActionLimitExceededError } from 'common/errors'
import { CacheService, redis } from 'connectors'

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
directive @${directiveName}(period: Int!, limit: Int!) on FIELD_DEFINITION`,

  transformer: (schema: GraphQLSchema) => {
    return mapSchema(schema, {
      [MapperKind.OBJECT_FIELD]: (fieldConfig, fieldName) => {
        const directive = getDirective(schema, fieldConfig, directiveName)?.[0]

        if (directive) {
          const { resolve = defaultFieldResolver } = fieldConfig
          const { limit, period } = directive
          fieldConfig.resolve = async (source, args, context, info) => {
            const { viewer } = context

            const pass = await checkOperationLimit({
              user: viewer.id || viewer.ip,
              operation: fieldName,
              limit,
              period,
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
