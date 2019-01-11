import { MutationToUserLoginResolver } from 'definitions'

const resolver: MutationToUserLoginResolver = (
  root,
  { input },
  { dataSources: { userService } }
) => userService.login(input)

export default resolver
