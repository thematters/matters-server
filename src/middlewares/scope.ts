// external
import isObject from 'lodash/isObject'
import has from 'lodash/has'
import get from 'lodash/get'
// internal
import { GQL_OPERATION, SCOPE_MODE, SCOPE_TYPE } from 'common/enums'
import { ForbiddenError, UnknownError } from 'common/errors'
import { isValidReadScope } from 'common/utils/scope'

export const scopeMiddleware = async (
  resolve: any,
  root: { [key: string]: any },
  args: any,
  context: any,
  info: any
) => {
  if (root) {
    // validate OAuth scope
    if (context.viewer.scopeMode === SCOPE_MODE.oauth) {
      const operation = get(info, 'operation.operation')

      switch (operation) {
        case GQL_OPERATION.mutation: {
          throw new ForbiddenError('viewer has no permission')
          break
        }

        case GQL_OPERATION.query: {
          if (!isValidReadScope(context.viewer.scope, info.path)) {
            throw new ForbiddenError('viewer has no permission')
          }
          break
        }

        default: {
          throw new UnknownError('unknown operation')
          break
        }
      }
    }
  }
  return resolve(root, args, context, info)
}
