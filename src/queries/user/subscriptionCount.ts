import { UserStatusToSubscriptionCountResolver } from 'definitions'

const resolver: UserStatusToSubscriptionCountResolver = async (
  { id },
  _,
  { dataSources: { userService } }
) => userService.countSubscription(id)

export default resolver
