import { Resolver } from 'definitions'

const resolver: Resolver = (root, { input }, { userService }) =>
  userService.login(input)

export default resolver
