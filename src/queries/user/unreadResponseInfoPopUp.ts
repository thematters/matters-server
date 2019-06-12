import { UserStatusToUnreadResponseInfoPopUpResolver } from 'definitions'

const resolver: UserStatusToUnreadResponseInfoPopUpResolver = async (
  { id },
  _,
  { dataSources: { systemService } }
) => {
  const readResponseInfoPopUpLog = await systemService.findLogRecord({
    userId: id,
    type: 'read_response_info_pop_up'
  })

  if (!readResponseInfoPopUpLog) {
    return true
  }

  return false
}

export default resolver
