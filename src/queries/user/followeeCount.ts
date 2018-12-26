import { Resolver } from 'definitions'

const resolver: Resolver = async (
  { id },
  _,
  { dataSources: { userService } }
) => userService.countFollowees(id)

export default resolver
