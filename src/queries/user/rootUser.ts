import { Resolver } from 'src/definitions'

const resolver: Resolver = (root, { id }, { userService }, info) =>
  userService.loader.load(id)

export default resolver
