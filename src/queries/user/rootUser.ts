import { QueryToUserResolver } from 'definitions'

const resolver: QueryToUserResolver = async (
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
