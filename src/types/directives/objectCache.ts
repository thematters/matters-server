import { mapSchema, getDirective, MapperKind } from '@graphql-tools/utils'
import { defaultFieldResolver, GraphQLSchema } from 'graphql'

import { CACHE_PREFIX } from 'common/enums'
import { CacheService } from 'connectors'

export const objectCacheDirective = (directiveName = 'objectCache') => ({
  typeDef: `directive @${directiveName}(maxAge: Int = 1000) on FIELD_DEFINITION`,

  transformer: (schema: GraphQLSchema) => {
    return mapSchema(schema, {
      [MapperKind.OBJECT_FIELD]: (fieldConfig, fieldName, typeName) => {
        const directive = getDirective(schema, fieldConfig, directiveName)?.[0]
        if (directive) {
          const { resolve = defaultFieldResolver } = fieldConfig
          const { maxAge } = directive
          fieldConfig.resolve = async (root, args, context, info) => {
            const { id } = root
            const cacheService = new CacheService(CACHE_PREFIX.OBJECTS)
            return cacheService.getObject({
              keys: {
                type: typeName,
                id,
                field: fieldName,
                args,
              },
              getter: () =>
                resolve(root, args, context, info) as Promise<unknown>,
              expire: maxAge,
            })
          }
          return fieldConfig
        }
      },
    })
  },
})
