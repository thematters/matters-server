import { Resolver } from 'definitions'

const resolver: Resolver = async ({ id }, _, { userService }) =>
  userService.findOAuthTypes(id)

export default resolver
