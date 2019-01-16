import { MutationToUserLoginResolver } from 'definitions'

const resolver: MutationToUserLoginResolver = (
  root,
  { input },
  { dataSources: { userService } }
) =>
  userService.login({
    ...input,
    email: input.email ? input.email.toLowerCase() : null
  })

export default resolver
