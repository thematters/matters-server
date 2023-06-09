import { cacheControlFromInfo } from '@apollo/cache-control-types'
import { mapSchema, getDirective, MapperKind } from '@graphql-tools/utils'
import { defaultFieldResolver, GraphQLSchema } from 'graphql'

import { CACHE_TTL } from 'common/enums'

export const privateCacheDirective = (directiveName = 'privateCache') => ({
  typeDef: `directive @${directiveName}(strict: Boolean! = false) on FIELD_DEFINITION`,

  transformer: (schema: GraphQLSchema) => {
    return mapSchema(schema, {
      [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
        const directive = getDirective(schema, fieldConfig, directiveName)?.[0]
        if (directive) {
          const { resolve = defaultFieldResolver } = fieldConfig
          const { strict } = directive
          fieldConfig.resolve = async (root, args, context, info) => {
            const { viewer } = context
            const logged = viewer.id && viewer.hasRole('user')
            const grouped = !!viewer.group
            let maxAge: number | undefined
            if (strict && logged) {
              maxAge = CACHE_TTL.INSTANT
            }

            const cacheControl = cacheControlFromInfo(info)

            let scope = 'PUBLIC' as 'PUBLIC' | 'PRIVATE'
            if (logged) {
              scope = 'PRIVATE'
              maxAge = Math.min(
                CACHE_TTL.PRIVATE_QUERY,
                cacheControl.cacheHint.maxAge || 0
              )
            } else if (grouped) {
              scope = 'PRIVATE'
            }

            if (typeof maxAge === 'number') {
              cacheControl.setCacheHint({ maxAge, scope })
            } else {
              cacheControl.setCacheHint({ scope })
            }
            return await resolve(root, args, context, info)
          }
          return fieldConfig
        }
      },
    })
  },
})
