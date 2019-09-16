// external
import * as Sentry from '@sentry/node'
import get from 'lodash/get'
import replace from 'lodash/replace'
// internal
import { GQL_OPERATION } from 'common/enums'

type CacheSet = {
  id: string
  type: string
}

const getCacheKey = (custom: CacheSet, fallback: CacheSet) => {
  if (custom && custom.id && custom.type) {
    return `cache-keys:${custom.type}:${custom.id}`
  }
  return `cache-keys:${replace(fallback.type, '!', '')}:${fallback.id}`
}

export const cacheMiddleware = async (
  resolve: any,
  root: { [key: string]: any },
  args: any,
  context: any,
  info: any
) => {
  const operation = get(info, 'operation.operation')
  const result = await resolve(root, args, context, info)

  if (operation === GQL_OPERATION.mutation) {
    const { redis } = context
    const { returnType } = info
    if (result && result.id && redis && returnType) {
      try {
        const key = getCacheKey(result.cache, { id: result.id, type: returnType })
        const hashes = await redis.client.smembers(key)
        hashes.map((hash: string) =>
          redis.client
            .pipeline()
            .del(`fqc:${hash}`)
            .srem(key, hash)
            .exec()
        )
      } catch (error) {
        Sentry.captureException(error)
      }
    }
  }
  return result
}
