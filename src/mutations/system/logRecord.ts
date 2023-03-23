import { LOG_RECORD_TYPES } from 'common/enums/index.js'
import { ForbiddenError } from 'common/errors.js'
import { MutationToLogRecordResolver } from 'definitions'

const resolver: MutationToLogRecordResolver = async (
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
