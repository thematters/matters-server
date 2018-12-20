import { Resolver } from 'definitions'

const resolver: Resolver = async ({ id }, _, { userService }) =>
  userService.countFollowers(id)

export default resolver
