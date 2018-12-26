import { Resolver } from 'definitions'

const resolver: Resolver = async (
  { id },
  _,
  { dataSources: { userService } }
) => userService.countSubscription(id)

export default resolver
