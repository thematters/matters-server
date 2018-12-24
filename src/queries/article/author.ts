import { Resolver } from 'definitions'

const resolver: Resolver = ({ id }, _, { userService }) =>
  userService.dataloader.load(id)

export default resolver
