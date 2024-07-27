import type { GQLUserSettingsResolvers } from 'definitions'

const resolver: GQLUserSettingsResolvers['notification'] = async (
  { id, email },
  _,
  { dataSources: { userService } }
) => {
  if (!id) {
    return null
  }

  const settings = await userService.findNotifySetting(id)

  return {
    ...settings,
    articleNewComment: settings.newComment,
    articleNewAppreciation: settings.newLike,
    email: settings.email && !!email,
  }
}

export default resolver
