import { AuthenticationError } from 'common/errors.js'
import { MutationToUpdateNotificationSettingResolver } from 'definitions'

const resolver: MutationToUpdateNotificationSettingResolver = async (
  _,
  { input: { type, enabled } },
  { viewer, dataSources: { userService } }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  const notifySetting = await userService.findNotifySetting(viewer.id)

  await userService.updateNotifySetting(notifySetting.id, {
    [type]: enabled,
  })

  return viewer
}

export default resolver
