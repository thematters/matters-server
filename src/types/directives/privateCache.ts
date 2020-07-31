import { CacheScope } from 'apollo-cache-control'
import { defaultFieldResolver, GraphQLField } from 'graphql'
import { SchemaDirectiveVisitor } from 'graphql-tools'

import { CACHE_TTL } from 'common/enums'

export class PrivateCacheDirective extends SchemaDirectiveVisitor {
  visitFieldDefinition(field: GraphQLField<any, any>) {
    const { resolve = defaultFieldResolver } = field

    field.resolve = async (...args) => {
      const { strict } = this.args
      const [root, _, { viewer }, { fieldName, cacheControl }] = args
      const logged = viewer.id && viewer.hasRole('user')

      let maxAge = CACHE_TTL.SHORT
      if (strict && logged) {
        maxAge = CACHE_TTL.INSTANT
      }

      let scope = CacheScope.Public
      if (logged) {
        scope = CacheScope.Private
      }

      cacheControl.setCacheHint({ maxAge, scope })
      return resolve.apply(this, args)
    }
  }
}
