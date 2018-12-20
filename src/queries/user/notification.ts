import { Resolver } from 'definitions'

const resolver: Resolver = async ({ id }, _, { userService }) =>
  userService.findNotifySetting(id)

export default resolver
