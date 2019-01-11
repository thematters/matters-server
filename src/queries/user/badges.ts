import { UserInfoToBadgesResolver, Context } from 'definitions'

const resolver: UserInfoToBadgesResolver = async (
  { id },
  _,
  { dataSources: { userService } }
) => userService.findBadges(id)

export default resolver
