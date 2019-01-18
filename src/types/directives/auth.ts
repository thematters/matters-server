import { SchemaDirectiveVisitor } from 'graphql-tools'
import { GraphQLObjectType, defaultFieldResolver, GraphQLField } from 'graphql'
import { AuthenticationError } from 'apollo-server'
import { Context } from 'definitions'

type EnhancedObject = GraphQLObjectType & {
  _requiredAuthRole?: string
  _authFieldsWrapped?: boolean
}
type EnhancedField = GraphQLField<any, any> & { _requiredAuthRole?: string }

export class AuthDirective extends SchemaDirectiveVisitor {
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
    if (objectType._authFieldsWrapped) return
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

        const context: Context = args[2]

        if (!context.viewer.hasRole(requiredRole)) {
          throw new AuthenticationError(
            `role ${context.viewer.role} is not authorized`
          )
        }

        return resolve.apply(this, args)
      }
    })
  }
}
