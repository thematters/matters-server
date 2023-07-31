import type { GQLUserSettingsResolvers } from 'definitions'

const resolver: GQLUserSettingsResolvers['notification'] = (
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
