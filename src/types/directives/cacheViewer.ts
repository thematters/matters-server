import { CacheScope } from 'apollo-cache-control'
import { SchemaDirectiveVisitor } from 'graphql-tools'
import { GraphQLObjectType, defaultFieldResolver, GraphQLField } from 'graphql'
import { ForbiddenError } from 'common/errors'
import { Context } from 'definitions'

type Params = {
  _maxAge?: number
  _scope?: CacheScope
}

type EnhancedObject = GraphQLObjectType & Params

type EnhancedField = GraphQLField<any, any> & Params

export class CacheViewerDirective extends SchemaDirectiveVisitor {
  visitObject(type: EnhancedObject) {
    this.ensureFieldsWrapped(type)
    type._maxAge = this.args.maxAge
    type._scope = this.args.scope
  }

  visitFieldDefinition(
    field: EnhancedField,
    details: { objectType: EnhancedObject }
  ) {
    this.ensureFieldsWrapped(details.objectType)
    field._maxAge = this.args.maxAge
    field._scope = this.args.scope
  }

  ensureFieldsWrapped(objectType: EnhancedObject) {
    const fields: { [key: string]: EnhancedField } = objectType.getFields()

    Object.keys(fields).forEach(fieldName => {
      const field = fields[fieldName]
      const { resolve = defaultFieldResolver } = field
      field.resolve = async function(...args) {
        const [{ id }, _, { viewer }, { cacheControl }] = args
        const maxAge = field._maxAge || objectType._maxAge
        const scope = field._scope || objectType._scope

        // Set cache
        if (id && viewer && id === viewer.id) {
          cacheControl.setCacheHint({ scope: CacheScope.Private })
        } else if (maxAge || scope) {
          cacheControl.setCacheHint({
            ...(maxAge ? { maxAge }: {}),
            ...(scope ? { scope } : {})
          })
        }
        return resolve.apply(this, args)
      }
    })
  }
}
