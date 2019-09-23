// external
import * as Sentry from '@sentry/node'
import { SchemaDirectiveVisitor } from 'graphql-tools'
import { defaultFieldResolver, GraphQLField } from 'graphql'
// internal
import { CACHE_TTL } from 'common/enums'
import { fromGlobalId } from 'common/utils'

type Params = {
  _type: string
}

export class LogCacheDirective extends SchemaDirectiveVisitor {
  visitFieldDefinition(field: GraphQLField<any, any> & Params) {
    const { resolve = defaultFieldResolver } = field
    field._type = this.args.type
    field.resolve = async function(...args) {
      const [root, _, { viewer, cacheKeys, redis }] = args
      const result = await resolve.apply(this, args)
      if (result && result.id && redis && cacheKeys && field._type) {
        try {
          let cacheType = field._type
          switch (field._type) {
            case 'Node': {
              cacheType = result.__type
              break
            }
            case 'Response': {
              cacheType = result.type
              break
            }
          }
          cacheKeys.add(`cache-keys:${cacheType}:${result.id}`)
        } catch (error) {
          Sentry.captureException(error)
        }
      }
      return result
    }
  }
}
