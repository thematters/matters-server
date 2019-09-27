import * as Sentry from '@sentry/node'
import { defaultFieldResolver, GraphQLField } from 'graphql'
import { SchemaDirectiveVisitor } from 'graphql-tools'

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
            case 'Node':
            case 'Response': {
              cacheType = result.__type
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
