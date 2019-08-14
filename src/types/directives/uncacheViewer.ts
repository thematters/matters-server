import { CacheScope } from 'apollo-cache-control'
import { SchemaDirectiveVisitor } from 'graphql-tools'
import { defaultFieldResolver, GraphQLField } from 'graphql'
import { CACHE_TTL } from 'common/enums'

export class UncacheViewerDirective extends SchemaDirectiveVisitor {
  visitFieldDefinition(field: GraphQLField<any, any>) {
    const { resolve = defaultFieldResolver } = field

    field.resolve = async function(...args) {
      const [root, _, { viewer }, { cacheControl }] = args

      if (viewer.id || viewer.hasRole('admin')) {
        cacheControl.setCacheHint({
          maxAge: CACHE_TTL.INSTANT,
          scope: CacheScope.Private
        })
      }

      return resolve.apply(this, args)
    }
  }
}
