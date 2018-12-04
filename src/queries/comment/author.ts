import { Resolver } from 'src/definitions'

const resolver: Resolver = ({ authorId }, _, { userService }) =>
  userService.idLoader.load(authorId)

export default resolver
