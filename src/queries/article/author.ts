import { Resolver } from 'definitions'

const resolver: Resolver = ({ id }, _, { dataSources: { userService } }) =>
  userService.dataloader.load(id)

export default resolver
