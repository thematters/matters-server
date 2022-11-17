import { UserSettingsToNotificationResolver } from 'definitions'

const resolver: UserSettingsToNotificationResolver = (
  { id },
  _,
  { dataSources: { userService } }
) => {
  if (!id) {
    return null
  }
  return userService.findNotifySetting(id)
}
export default resolver
