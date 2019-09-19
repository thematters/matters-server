// external
import * as Sentry from '@sentry/node'
import { SchemaDirectiveVisitor } from 'graphql-tools'
import { defaultFieldResolver, GraphQLField } from 'graphql'
import _compact from 'lodash/compact'
import _get from 'lodash/get'
import _replace from 'lodash/replace'
// internal
import { CACHE_KEYWORD, GQL_OPERATION } from 'common/enums'

type CacheSet = {
  id: string
  type: string
}

const getCacheKeys = (customs: CacheSet[], fallback: CacheSet): string[] => {
  if (customs && customs.length > 0) {
    return _compact(
      customs.map((custom: CacheSet) => {
        if (custom && custom.id && custom.type) {
          return `cache-keys:${custom.type}:${custom.id}`
        }
      })
    )
  }
  return [`cache-keys:${_replace(fallback.type, '!', '')}:${fallback.id}`]
}

export class PurgeCacheDirective extends SchemaDirectiveVisitor {
  visitFieldDefinition(field: GraphQLField<any, any>) {
    const { resolve = defaultFieldResolver } = field
    field.resolve = async function(...args) {
      const [root, _, { redis }, { returnType }] = args
      const result = await resolve.apply(this, args)
      if (result && result.id && redis && returnType) {
        try {
          const cache = _get(result, CACHE_KEYWORD, [])
          const keys = getCacheKeys(cache, {
            id: result.id,
            type: `${returnType}`
          })
          keys.map(async (key: string) => {
            const hashes = await redis.client.smembers(key)
            hashes.map((hash: string) => {
              redis.client
                .pipeline()
                .del(`fqc:${hash}`)
                .srem(key, hash)
                .exec()
            })
          })
        } catch (error) {
          Sentry.captureException(error)
        }
      }
      return result
    }
  }
}
