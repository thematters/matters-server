import { Resolver } from 'definitions'

const resolver: Resolver = ({ id }, _, { dataSources: { userService } }) =>
  userService.findNotifySetting(id)
export default resolver
