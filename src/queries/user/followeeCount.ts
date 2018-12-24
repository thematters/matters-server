import { Resolver } from 'definitions'

const resolver: Resolver = async ({ id }, _, { userService }) =>
  userService.countFollowees(id)

export default resolver
