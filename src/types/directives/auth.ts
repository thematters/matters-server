import { SchemaDirectiveVisitor } from '@graphql-tools/utils'
import {
  defaultFieldResolver,
  GraphQLField,
  responsePathAsArray,
} from 'graphql'

import { AUTH_MODE, SCOPE_GROUP } from 'common/enums/index.js'
import { ForbiddenError } from 'common/errors.js'
import { isScopeAllowed } from 'common/utils/scope.js'

export class AuthDirective extends SchemaDirectiveVisitor {
  visitFieldDefinition(field: GraphQLField<any, any>) {
    const { resolve = defaultFieldResolver, name: fieldName } = field

    field.resolve = async (...args) => {
      const { mode: requireMode, group: requireGroup } = this.args
      const [root, , { viewer }, { path, operation }] = args
      const nodes = responsePathAsArray(path) || []

      const isQuery = operation.operation === 'query'
      const isSelf = root?.id === viewer?.id
      const errorMessage = `"${viewer.authMode}" isn't authorized for "${fieldName}"`

      /**
       * Query
       */
      if (isQuery) {
        // "visitor" can only access anonymous' fields
        if (!viewer.id && isSelf) {
          return resolve.apply(this, args)
        }

        // check require mode
        if (!viewer.hasAuthMode(requireMode)) {
          throw new ForbiddenError(errorMessage)
        }

        switch (viewer.authMode) {
          // "oauth" can only access granted fields
          case AUTH_MODE.oauth:
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
              return resolve.apply(this, args)
            }
            break

          // "user" can only access own fields
          case AUTH_MODE.user:
            if (isSelf) {
              return resolve.apply(this, args)
            }
            break

          // "admin" can access all user's fields
          case AUTH_MODE.admin:
            return resolve.apply(this, args)
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
        case AUTH_MODE.oauth:
          const requireMutationScope = [
            'mutation',
            requireGroup,
            ...nodes,
          ].join(':')
          const isStrict = requireGroup === SCOPE_GROUP.level3
          if (isScopeAllowed(viewer.scope, requireMutationScope, isStrict)) {
            return resolve.apply(this, args)
          }
          break
        case AUTH_MODE.user:
        case AUTH_MODE.admin:
          return resolve.apply(this, args)
      }

      throw new ForbiddenError(errorMessage)
    }
  }
}
