import { mapSchema, getDirective, MapperKind } from '@graphql-tools/utils'
import { defaultFieldResolver, GraphQLSchema } from 'graphql'
import { responsePathAsArray } from 'graphql'

import { AUTH_MODE, SCOPE_GROUP } from 'common/enums'
import { ForbiddenError } from 'common/errors'
import { isScopeAllowed } from 'common/utils/scope'

export const authDirective = (directiveName = 'auth') => ({
  typeDef: `directive @${directiveName}(mode: String!, group: String) on FIELD_DEFINITION`,

  transformer: (schema: GraphQLSchema) => {
    return mapSchema(schema, {
      [MapperKind.OBJECT_FIELD]: (fieldConfig, fieldName) => {
        const directive = getDirective(schema, fieldConfig, directiveName)?.[0]

        if (directive) {
          const { resolve = defaultFieldResolver } = fieldConfig
          const { mode: requireMode, group: requireGroup } = directive
          fieldConfig.resolve = async (root, args, context, info) => {
            const { viewer } = context
            const { path, operation } = info
            const nodes = responsePathAsArray(path) || []

            const isQuery = operation.operation === 'query'
            const isSelf = root?.id === viewer?.id
            const errorMessage = `"${viewer.authMode}" isn't authorized for "${fieldName}"`
            /**
             * Query
             */
            if (isQuery) {
              // "visitor" can only access anonymous' fields
              if (!viewer.id && isSelf && !nodes.includes('oss')) {
                return await resolve(root, args, context, info)
              }

              // check require mode
              if (!viewer.hasAuthMode(requireMode)) {
                throw new ForbiddenError(errorMessage)
              }

              switch (viewer.authMode) {
                // "oauth" can only access granted fields
                case AUTH_MODE.oauth: {
                  if (!isSelf) {
                    break
                  }

                  if (nodes[0] !== 'viewer') {
                    throw new ForbiddenError(
                      `"oauth" can only query start from "viewer" root`
                    )
                  }

                  const requireQueryScope = ['query', ...nodes].join(':')
                  if (isScopeAllowed(viewer.scope, requireQueryScope)) {
                    return await resolve(root, args, context, info)
                  }
                  break
                }

                // "user" can only access own fields
                case AUTH_MODE.user:
                  if (isSelf) {
                    return await resolve(root, args, context, info)
                  }
                  break

                // "admin" can access all user's fields
                case AUTH_MODE.admin:
                  return await resolve(root, args, context, info)
              }

              throw new ForbiddenError(errorMessage)
            }

            /**
             * Mutation
             */
            if (!viewer.hasAuthMode(requireMode)) {
              throw new ForbiddenError(errorMessage)
            }

            switch (viewer.authMode) {
              case AUTH_MODE.oauth: {
                const requireMutationScope = [
                  'mutation',
                  requireGroup,
                  ...nodes,
                ].join(':')
                const isStrict = requireGroup === SCOPE_GROUP.level3
                if (
                  isScopeAllowed(viewer.scope, requireMutationScope, isStrict)
                ) {
                  return await resolve(root, args, context, info)
                }
                break
              }
              case AUTH_MODE.user:
              case AUTH_MODE.admin:
                return await resolve(root, args, context, info)
            }

            throw new ForbiddenError(errorMessage)
          }
          return fieldConfig
        }
      },
    })
  },
})
