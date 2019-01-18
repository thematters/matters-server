import { SchemaDirectiveVisitor } from 'graphql-tools'
import { GraphQLObjectType, defaultFieldResolver, GraphQLField } from 'graphql'
import { ForbiddenError } from 'common/errors'

type EnhancedObject = GraphQLObjectType & {
  _selfFieldsWrapped?: boolean
}
type EnhancedField = GraphQLField<any, any> & { _requiredAuthRole?: string }

export class SelfDirective extends SchemaDirectiveVisitor {
  visitFieldDefinition(
    field: EnhancedField,
    details: {
      objectType: GraphQLObjectType
    }
  ) {
    this.ensureFieldsWrapped(details.objectType)
  }

  ensureFieldsWrapped(objectType: EnhancedObject) {
    // Mark the GraphQLObjectType object to avoid re-wrapping:
    if (objectType._selfFieldsWrapped) {
      return
    }
    objectType._selfFieldsWrapped = true

    const fields: { [key: string]: EnhancedField } = objectType.getFields()

    Object.keys(fields).forEach(fieldName => {
      const field = fields[fieldName]
      const { resolve = defaultFieldResolver } = field
      field.resolve = async function(...args) {
        const [{ id }, _, { viewer }] = args

        if (id !== viewer.id) {
          throw new ForbiddenError(`unauthorized user`)
        }

        return resolve.apply(this, args)
      }
    })
  }
}
