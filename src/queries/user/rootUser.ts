import { QueryToUserResolver } from 'definitions'

const resolver: QueryToUserResolver = async (
  root,
  { input: { userName } },
  { viewer, dataSources: { userService } },
  info
) => {
  if (!userName) {
    return
  }

  const user = await userService.findByUserName(userName)

  return user
}

export default resolver
