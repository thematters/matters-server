import {
  defaultFieldResolver,
  GraphQLField,
  responsePathAsArray,
} from 'graphql'
import { SchemaDirectiveVisitor } from 'graphql-tools'

import { SCOPE_GROUP, SCOPE_MODE } from 'common/enums'
import { ForbiddenError } from 'common/errors'
import { isValidScope } from 'common/utils/scope'

export class ScopeDirective extends SchemaDirectiveVisitor {
  visitFieldDefinition(field: GraphQLField<any, any>) {
    const { resolve = defaultFieldResolver, name: fieldName } = field

    field.resolve = async (...args) => {
      const { mode: requireMode, group: requireGroup } = this.args
      const [root, _, { viewer }, { path, operation }] = args
      const nodes = responsePathAsArray(path) || []

      const isQuery = operation.operation === 'query'
      const isSelf = root?.id === viewer?.id
      const errorMessage = `"${viewer.scopeMode}" isn't authorized for "${fieldName}"`

      /**
       * Query
       */
      if (isQuery) {
        // "visitor" can only access anonymous' fields
        if (!viewer.id && isSelf) {
          return resolve.apply(this, args)
        }

        // check require mode
        if (!viewer.hasScopeMode(requireMode)) {
          throw new ForbiddenError(errorMessage)
        }

        switch (viewer.scopeMode) {
          // "oauth" can only access granted fields
          case SCOPE_MODE.oauth:
            if (!isSelf) {
              break
            }

            if (nodes[0] !== 'viewer') {
              throw new ForbiddenError(
                `"oauth" can only query start from "viewer" root`
              )
            }

            const requireQueryScope = ['query', ...nodes].join(':')
            if (isValidScope(viewer.scope, requireQueryScope)) {
              return resolve.apply(this, args)
            }
            break

          // "user" can only access own fields
          case SCOPE_MODE.user:
            if (isSelf) {
              return resolve.apply(this, args)
            }
            break

          // "admin" can access all user's fields
          case SCOPE_MODE.admin:
            return resolve.apply(this, args)
        }

        throw new ForbiddenError(errorMessage)
      }

      /**
       * Mutation
       */
      if (!viewer.hasScopeMode(requireMode)) {
        throw new ForbiddenError(errorMessage)
      }

      const requireMutationScope = ['mutation', requireGroup, ...nodes].join(
        ':'
      )
      const isStrict = requireGroup === SCOPE_GROUP.level3
      if (isValidScope(viewer.scope, requireMutationScope, isStrict)) {
        return resolve.apply(this, args)
      }

      throw new ForbiddenError(errorMessage)
    }
  }
}
