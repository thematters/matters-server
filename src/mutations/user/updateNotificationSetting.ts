import { AuthenticationError } from 'apollo-server'
import { MutationToUpdateNotificationSettingResolver } from 'definitions'

const resolver: MutationToUpdateNotificationSettingResolver = async (
  _,
  { input: { type, enabled } },
  { viewer, dataSources: { userService } }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('anonymous user cannot do this') // TODO
  }

  const notifySetting = await userService.findNotifySetting(viewer.id)

  return await userService.updateNotifySetting(notifySetting.id, {
    [type]: enabled
  })
}

export default resolver
