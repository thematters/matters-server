import get from 'lodash/get'
import has from 'lodash/has'
import isObject from 'lodash/isObject'

import { GQL_OPERATION, SCOPE_MODE } from 'common/enums'
import { ForbiddenError, UnknownError } from 'common/errors'
import { isValidReadScope } from 'common/utils/scope'

export const scopeMiddleware = async (
  resolve: any,
  root: { [key: string]: any },
  args: any,
  context: any,
  info: any
) => {
  // check OAuth operation
  if (context.viewer.scopeMode === SCOPE_MODE.oauth) {
    const operation = get(info, 'operation.operation')

    switch (operation) {
      case GQL_OPERATION.mutation: {
        throw new ForbiddenError('viewer has no permission')
        break
      }

      case GQL_OPERATION.query: {
        break
      }

      default: {
        throw new UnknownError('unknown operation')
        break
      }
    }
  }
  return resolve(root, args, context, info)
}
