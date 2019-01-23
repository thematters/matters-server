import { MutationToUpdateNotificationSettingResolver } from 'definitions'
import { AuthenticationError, UserNotFoundError } from 'common/errors'

const resolver: MutationToUpdateNotificationSettingResolver = async (
  _,
  { input: { type, enabled } },
  { viewer, dataSources: { userService } }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  const notifySetting = await userService.findNotifySetting(viewer.id)

  return await userService.updateNotifySetting(notifySetting.id, {
    [type]: enabled
  })
}

export default resolver
