import { UserSettingsToOauthProvidersResolver } from 'definitions'

const resolver: UserSettingsToOauthProvidersResolver = (
  { id },
  _,
  { dataSources: { userService } }
) => userService.findOAuthProviders({ userId: id })

export default resolver
