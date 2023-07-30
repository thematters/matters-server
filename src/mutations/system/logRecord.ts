import type { GQLMutationResolvers } from 'definitions'

import { LOG_RECORD_TYPES } from 'common/enums'
import { ForbiddenError } from 'common/errors'

const resolver: GQLMutationResolvers['logRecord'] = async (
  root,
  { input: { type } },
  { viewer, dataSources: { systemService } }
) => {
  if (!(type in LOG_RECORD_TYPES) || !viewer.id) {
    throw new ForbiddenError('only authenticated user can log with this "type"')
  }

  await systemService.logRecord({
    userId: viewer.id,
    type: LOG_RECORD_TYPES[type],
  })

  return true
}

export default resolver
