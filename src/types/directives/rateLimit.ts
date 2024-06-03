import { mapSchema, getDirective, MapperKind } from '@graphql-tools/utils'
import { defaultFieldResolver, GraphQLSchema } from 'graphql'

import { ActionLimitExceededError } from 'common/errors'
import { checkOperationLimit } from 'common/utils'

export const rateLimitDirective = (directiveName = 'rateLimit') => ({
  typeDef: `"Rate limit within a given period of time, in seconds"
directive @${directiveName}(period: Int!, limit: Int!) on FIELD_DEFINITION`,

  transformer: (schema: GraphQLSchema) => {
    return mapSchema(schema, {
      [MapperKind.OBJECT_FIELD]: (fieldConfig, fieldName) => {
        const directive = getDirective(schema, fieldConfig, directiveName)?.[0]

        if (directive) {
          const { resolve = defaultFieldResolver } = fieldConfig
          const { limit, period } = directive
          fieldConfig.resolve = async (source, args, context, info) => {
            const { viewer } = context

            const pass = await checkOperationLimit({
              user: viewer.id || viewer.ip,
              operation: fieldName,
              limit,
              period,
              redis: context.dataSources.connections.redis,
            })

            if (!pass) {
              throw new ActionLimitExceededError(
                `rate exceeded for operation ${fieldName}`
              )
            }

            return await resolve(source, args, context, info)
          }
          return fieldConfig
        }
      },
    })
  },
})
