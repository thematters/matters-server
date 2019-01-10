import { Resolver } from 'definitions'

const resolver: Resolver = ({ id }, _, { dataSources: { userService } }) =>
  userService.isUserNameEditable(id)

export default resolver
