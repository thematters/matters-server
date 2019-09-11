// external
import * as Sentry from '@sentry/node'
import get from 'lodash/get'
import replace from 'lodash/replace'
// internal
import { GQL_OPERATION } from 'common/enums'

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
    if (result.id && redis && returnType) {
      try {
        const key = `cache-keys:${replace(returnType, '!', '')}:${result.id}`
        const hashes = await redis.client.smembers(key)
        hashes.map((hash: string) =>
          redis.client
            .pipeline()
            .del(`fqc:${hash}`)
            .srem(key, hash)
            .exec()
        )
      }
      catch (error) {
        Sentry.captureException(error)
      }
    }
  }
  return result
}
