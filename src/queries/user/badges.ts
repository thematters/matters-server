import { UserInfoToBadgesResolver } from 'definitions'

const resolver: UserInfoToBadgesResolver = async (
  { id },
  _,
  { dataSources: { userService } }
) => {
  if (id === undefined) {
    return []
  }
  return userService.findBadges(id)
}

export default resolver
