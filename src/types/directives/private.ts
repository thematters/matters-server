import { defaultFieldResolver, GraphQLField } from 'graphql'
import { SchemaDirectiveVisitor } from 'graphql-tools'

import { ForbiddenError } from 'common/errors'

export class PrivateDirective extends SchemaDirectiveVisitor {
  visitFieldDefinition(field: GraphQLField<any, any>) {
    const { resolve = defaultFieldResolver, name } = field

    field.resolve = async function (...args) {
      const [{ id }, _, { viewer }] = args

      if (id === viewer.id || viewer.hasScopeMode('admin')) {
        return resolve.apply(this, args)
      }

      throw new ForbiddenError(`unauthorized user for field ${name}`)
    }
  }
}
