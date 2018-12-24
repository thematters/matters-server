import { Resolver } from 'definitions'

const resolver: Resolver = (
  root,
  { input },
  { dataSources: { userService } }
) => userService.login(input)

export default resolver
