import type { CacheScope } from '@apollo/cache-control-types'

import { cacheControlFromInfo } from '@apollo/cache-control-types'
import { SchemaDirectiveVisitor } from '@graphql-tools/utils'
import { defaultFieldResolver, GraphQLField } from 'graphql'

import { CACHE_TTL } from 'common/enums'

export class PrivateCacheDirective extends SchemaDirectiveVisitor {
  visitFieldDefinition(field: GraphQLField<any, any>) {
    const { resolve = defaultFieldResolver } = field

    field.resolve = async (...args) => {
      const { strict } = this.args
      const [, , { viewer }, info] = args
      const logged = viewer.id && viewer.hasRole('user')
      const grouped = !!viewer.group

      let maxAge: number | undefined
      if (strict && logged) {
        maxAge = CACHE_TTL.INSTANT
      }

      let scope = 'PUBLIC' as CacheScope
      if (logged) {
        scope = 'PRIVATE'
        maxAge = Math.min(
          CACHE_TTL.PRIVATE_QUERY,
          info.cacheControl.cacheHint.maxAge || 0
        )
      } else if (grouped) {
        scope = 'PRIVATE'
      }

      const cacheControl = cacheControlFromInfo(info)
      if (typeof maxAge === 'number') {
        cacheControl.setCacheHint({ maxAge, scope })
      } else {
        cacheControl.setCacheHint({ scope })
      }
      return resolve.apply(this, args)
    }
  }
}
