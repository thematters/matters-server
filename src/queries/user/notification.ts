import { UserSettingsToNotificationResolver } from 'definitions'

const resolver: UserSettingsToNotificationResolver = (
  { id },
  _,
  { dataSources: { userService } }
) => userService.findNotifySetting(id)
export default resolver
