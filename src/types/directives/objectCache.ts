import {
  defaultFieldResolver,
  GraphQLField,
  isWrappingType,
  GraphQLList,
  GraphQLOutputType,
} from 'graphql'
import { SchemaDirectiveVisitor } from 'graphql-tools'

import { CACHE_PREFIX } from 'common/enums'
import { CacheService } from 'connectors'

const cacheService = new CacheService(undefined, CACHE_PREFIX.OBJECTS)

export class RateLimitDirective extends SchemaDirectiveVisitor {
  public visitFieldDefinition(field: GraphQLField<any, any>) {
    const { resolve = defaultFieldResolver, name } = field

    // unwrap list type
    let type = field.type as Exclude<GraphQLOutputType, GraphQLList<any>>
    while (isWrappingType(type)) {
      type = type.ofType
    }

    const { maxAge } = this.args

    field.resolve = function (...args) {
      const [{ id }] = args

      return cacheService.getObject({
        type: type.name,
        id,
        field: 'originalLanguage',
        getter: resolve.apply(this, args),
        expire: maxAge,
      })
    }
  }
}
