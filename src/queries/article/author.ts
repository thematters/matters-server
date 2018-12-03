import { Resolver } from 'src/definitions'

const resolver: Resolver = ({ uuid }, _, { userService }) =>
  userService.loader.load(uuid)

export default resolver
