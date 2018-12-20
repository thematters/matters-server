import { Resolver } from 'definitions'

const resolver: Resolver = async ({ id }, _, { userService }) =>
  userService.countSubscription(id)

export default resolver
