import { Resolver } from 'definitions'

const resolver: Resolver = async (
  { id },
  _,
  { dataSources: { userService } }
) => userService.findOAuthTypes(id)

export default resolver
