import { CacheScope } from 'apollo-cache-control'
import { SchemaDirectiveVisitor } from 'graphql-tools'
import { defaultFieldResolver, GraphQLField } from 'graphql'

import { CACHE_TTL } from 'common/enums'

type Params = {
  _strict: boolean
}

export class PrivateCacheDirective extends SchemaDirectiveVisitor {
  visitFieldDefinition(field: GraphQLField<any, any> & Params) {
    const { resolve = defaultFieldResolver } = field
    field._strict = this.args.strict
    field.resolve = async function(...args) {
      const [root, _, { viewer }, { fieldName, cacheControl }] = args
      const logged = viewer.id && viewer.hasRole('user')
      let maxAge = CACHE_TTL.DEFAULT
      if (field._strict === true && logged) {
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
