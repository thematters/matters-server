// external
import * as Sentry from '@sentry/node'
import { SchemaDirectiveVisitor } from 'graphql-tools'
import { defaultFieldResolver, GraphQLField } from 'graphql'
// internal
import { CACHE_TTL } from 'common/enums'

type Params = {
  _cacheType: string
}

export class RecordCacheDirective extends SchemaDirectiveVisitor {
  visitFieldDefinition(field: GraphQLField<any, any> & Params) {
    const { resolve = defaultFieldResolver } = field
    field._cacheType = this.args.type
    field.resolve = async function(...args) {
      const [root, _, { viewer, cacheKey, redis }] = args
      const result = await resolve.apply(this, args)
      if (result.id && redis && cacheKey && field._cacheType) {
        try {
          const key = `cache-keys:${field._cacheType}:${result.id}`
          redis.client.sadd(key, cacheKey)
          redis.client.expire(key, CACHE_TTL.SHORT)
        }
        catch (error) {
          Sentry.captureException(error)
        }
      }
      return result
    }
  }
}
