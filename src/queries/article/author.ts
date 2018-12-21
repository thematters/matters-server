import { Resolver } from 'definitions'

const resolver: Resolver = ({ id }, _, { userService }) =>
  userService.idLoader.load(id)

export default resolver
