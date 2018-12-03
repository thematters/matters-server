import { Resolver } from 'src/definitions'

const resolver: Resolver = ({ authorUUID }, _, { userService }) =>
  userService.loader.load(authorUUID)

export default resolver
