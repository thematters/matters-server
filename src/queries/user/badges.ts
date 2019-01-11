import { UserInfoToBadgesResolver, Context } from 'definitions'

const resolver: UserInfoToBadgesResolver = async (
  { id },
  _,
  { dataSources: { userService } }: Context
) => userService.findBadges(id)

export default resolver
