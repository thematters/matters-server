import { defaultFieldResolver, GraphQLField, GraphQLObjectType } from 'graphql'
import { SchemaDirectiveVisitor } from 'graphql-tools'

import { ForbiddenError } from 'common/errors'

type EnhancedObject = GraphQLObjectType & {
  _requiredAuthRole?: string
  _authFieldsWrapped?: boolean
}
type EnhancedField = GraphQLField<any, any> & { _requiredAuthRole?: string }

export const authDirectiveFactory = (AuthError = ForbiddenError) => {
  class AuthDirective extends SchemaDirectiveVisitor {
    visitObject(type: EnhancedObject) {
      this.ensureFieldsWrapped(type)
      type._requiredAuthRole = this.args.requires
    }
    // Visitor methods for nested types like fields and arguments
    // also receive a details object that provides information about
    // the parent and grandparent types.
    visitFieldDefinition(
      field: EnhancedField,
      details: {
        objectType: GraphQLObjectType
      }
    ) {
      this.ensureFieldsWrapped(details.objectType)
      field._requiredAuthRole = this.args.requires
    }

    ensureFieldsWrapped(objectType: EnhancedObject) {
      // Mark the GraphQLObjectType object to avoid re-wrapping:
      if (objectType._authFieldsWrapped) {
        return
      }
      objectType._authFieldsWrapped = true

      const fields: { [key: string]: EnhancedField } = objectType.getFields()

      Object.keys(fields).forEach(fieldName => {
        const field = fields[fieldName]
        const { resolve = defaultFieldResolver } = field
        field.resolve = async function(...args) {
          // Get the required Role from the field first, falling back
          // to the objectType if no Role is required by the field:
          const requiredRole =
            field._requiredAuthRole || objectType._requiredAuthRole

          if (!requiredRole) {
            return resolve.apply(this, args)
          }

          const context = args[2]

          if (!context.viewer.hasScopeMode(requiredRole)) {
            throw new AuthError(`${context.viewer.scopeMode} is not authorized`)
          }

          return resolve.apply(this, args)
        }
      })
    }
  }

  return AuthDirective
}
