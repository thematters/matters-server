import { UserSettingsToOauthTypeResolver } from 'definitions'

const resolver: UserSettingsToOauthTypeResolver = async (
  { id },
  _,
  { dataSources: { userService } }
) => userService.findOAuthTypes(id)

export default resolver
