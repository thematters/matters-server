import type { GQLUserInfoResolvers } from 'definitions'

const resolver: GQLUserInfoResolvers['userNameEditable'] = (
  { id },
  _,
  { dataSources: { userService } }
) => {
  if (!id) {
    return false
  }

  return userService.isUserNameEditable(id)
}

export default resolver
