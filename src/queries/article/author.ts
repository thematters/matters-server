import { Resolver } from 'src/definitions'

const resolver: Resolver = ({ authorId }, _, { userService }) =>
  userService.loader.load(authorId)

export default resolver
