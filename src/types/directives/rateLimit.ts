import { defaultFieldResolver, GraphQLField } from 'graphql'
import { SchemaDirectiveVisitor } from 'graphql-tools'

import { CACHE_PREFIX } from 'common/enums'
import { ActionLimitExceededError } from 'common/errors'
import { CacheService } from 'connectors'

const cacheService = new CacheService(undefined, CACHE_PREFIX.OPERATION_LOG)

export class RateLimitDirective extends SchemaDirectiveVisitor {
  public visitFieldDefinition(field: GraphQLField<any, any>) {
    const { resolve = defaultFieldResolver, name } = field
    const { limit, period } = this.args

    field.resolve = async function (...args) {
      const [root, _, { viewer }] = args

      const pass = await cacheService.checkOperationLimit({
        user: viewer.id || viewer.ip,
        operation: name,
        limit,
        period,
      })

      if (!pass) {
        throw new ActionLimitExceededError(
          `rate exceeded for operation ${name}`
        )
      }

      return resolve.apply(this, args)
    }
  }
}
