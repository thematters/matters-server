import { Resolver } from 'definitions'

const resolver: Resolver = ({ id }, _, { dataSources: { userService } }) =>
  userService.countUnreadNotice(id)

export default resolver
