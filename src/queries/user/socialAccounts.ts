import type { GQLUserInfoResolvers } from '#definitions/index.js'

const resolver: GQLUserInfoResolvers['socialAccounts'] = async (
  { id },
  _,
  { dataSources: { userService }, viewer }
) => {
  if (!viewer.id) return []
  if (id !== viewer.id) return []
  return userService.findSocialAccountsByUserId(id)
}

export default resolver
