import { Resolver } from 'definitions'

const resolver: Resolver = async (
  { id },
  _,
  { dataSources: { userService } }
) => userService.findBadges(id)

export default resolver
