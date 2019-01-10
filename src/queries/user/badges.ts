import { UserSettingsToOauthTypeResolver } from 'definitions'

const resolver: UserSettingsToOauthTypeResolver = async (
  { id },
  _,
  { dataSources: { userService } }
) => userService.findBadges(id)

export default resolver
