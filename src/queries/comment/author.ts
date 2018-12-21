import { Resolver } from 'definitions'

const resolver: Resolver = ({ authorId }, _, { userService }) =>
  userService.idLoader.load(authorId)

export default resolver
