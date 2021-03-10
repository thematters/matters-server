import { CacheScope } from 'apollo-cache-control'
import { defaultFieldResolver, GraphQLField } from 'graphql'
import { SchemaDirectiveVisitor } from 'graphql-tools'

import { CACHE_TTL } from 'common/enums'

export class PrivateCacheDirective extends SchemaDirectiveVisitor {
  visitFieldDefinition(field: GraphQLField<any, any>) {
    const { resolve = defaultFieldResolver } = field

    field.resolve = async (...args) => {
      const { strict } = this.args
      const [, , { viewer }, { cacheControl }] = args
      const logged = viewer.id && viewer.hasRole('user')
      const grouped = !!viewer.group

      let maxAge: number | undefined
      if (strict && logged) {
        maxAge = CACHE_TTL.INSTANT
      }

      let scope = CacheScope.Public
      if (logged) {
        scope = CacheScope.Private
        maxAge = Math.min(
          CACHE_TTL.PRIVATE_QUERY,
          cacheControl.cacheHint.maxAge || 0
        )
      } else if (grouped) {
        scope = CacheScope.Private
      }

      if (typeof maxAge === 'number') {
        cacheControl.setCacheHint({ maxAge, scope })
      } else {
        cacheControl.setCacheHint({ scope })
      }
      return resolve.apply(this, args)
    }
  }
}
