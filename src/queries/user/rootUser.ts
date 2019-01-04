import { Resolver } from 'definitions'

const resolver: Resolver = async (
  root,
  { input: { userName } },
  { viewer, dataSources: { userService } }
) => {
  if (!userName) {
    return
  }
  return userService.findByUserName(userName)
}

export default resolver
