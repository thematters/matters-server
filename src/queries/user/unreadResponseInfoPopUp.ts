import { LOG_RECORD_TYPES } from 'common/enums'
import { UserStatusToUnreadResponseInfoPopUpResolver } from 'definitions'

const resolver: UserStatusToUnreadResponseInfoPopUpResolver = async (
  { id },
  _,
  { dataSources: { systemService } }
) => {
  const readResponseInfoPopUpLog = await systemService.findLogRecord({
    userId: id,
    type: LOG_RECORD_TYPES.ReadResponseInfoPopUp,
  })

  if (!readResponseInfoPopUpLog) {
    return true
  }

  return false
}

export default resolver
