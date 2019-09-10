import {
  defaultFieldResolver,
  GraphQLField,
  responsePathAsArray
} from 'graphql'
import { SchemaDirectiveVisitor } from 'graphql-tools'

import { SCOPE_MODE } from 'common/enums'
import { ForbiddenError } from 'common/errors'
import { isValidReadScope } from 'common/utils/scope'

export class ScopeDirective extends SchemaDirectiveVisitor {
  visitFieldDefinition(field: GraphQLField<any, any>) {
    const { resolve = defaultFieldResolver, name } = field

    field.resolve = async function(...args) {
      const [{ id }, _, { viewer }, { path }] = args

      switch (viewer.scopeMode) {
        case SCOPE_MODE.oauth: {
          const nodes = responsePathAsArray(path) || []
          if (nodes[0] !== 'viewer') {
            break
          }
          if (isValidReadScope(viewer.scope, nodes)) {
            return resolve.apply(this, args)
          }
          throw new ForbiddenError('viewer has no permission')
          break
        }
        case SCOPE_MODE.visitor:
        case SCOPE_MODE.user: {
          if (id === viewer.id) {
            return resolve.apply(this, args)
          }
          break
        }
        case SCOPE_MODE.admin: {
          if (viewer.id) {
            return resolve.apply(this, args)
          }
          break
        }
      }
      throw new ForbiddenError(`unauthorized user for field ${name}`)
    }
  }
}
