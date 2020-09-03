import {
  defaultFieldResolver,
  GraphQLField,
  responsePathAsArray,
} from 'graphql'
import { SchemaDirectiveVisitor } from 'graphql-tools'

import { SCOPE_MODE } from 'common/enums'
import { AuthenticationError, ForbiddenError } from 'common/errors'
import { isValidReadScope } from 'common/utils/scope'

export class ScopeDirective extends SchemaDirectiveVisitor {
  visitFieldDefinition(field: GraphQLField<any, any>) {
    const { resolve = defaultFieldResolver, name } = field

    field.resolve = async (...args) => {
      const { mode, group } = this.args
      const [root, _, { viewer }, { path, operation }] = args

      console.log({
        path: responsePathAsArray(path),
        operation: operation.operation,
        mode,
        group,
        viewer,
      })

      /**
       * Check Mode
       */
      if (!viewer.hasScopeMode(mode)) {
        if (!viewer.id) {
          throw new AuthenticationError('viewer has no permission')
        }

        throw new ForbiddenError(`${viewer.scopeMode} is not authorized`)
      }

      if (viewer.scopeMode !== SCOPE_MODE.oauth) {
        return resolve.apply(this, args)
      }

      /**
       * Check OAuth Scope
       */
      // mutation
      if (operation.operation === 'mutation') {
        return resolve.apply(this, args)
      }

      // query
      const nodes = responsePathAsArray(path) || []

      if (nodes[0] !== 'viewer') {
        throw new ForbiddenError('viewer has no permission')
      }

      if (isValidReadScope(viewer.scope, nodes)) {
        return resolve.apply(this, args)
      }

      throw new ForbiddenError('viewer has no permission')
    }
  }
}
