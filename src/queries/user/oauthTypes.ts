import { UserSettingsToOauthTypesResolver } from 'definitions'

const resolver: UserSettingsToOauthTypesResolver = (
  { id },
  _,
  { dataSources: { userService } }
) => userService.findOAuthTypes({ userId: id })

export default resolver
