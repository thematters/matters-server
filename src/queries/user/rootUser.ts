import { BLOCK_USERS } from 'common/enums'
import { QueryToUserResolver } from 'definitions'

const resolver: QueryToUserResolver = async (
  root,
  { input: { userName } },
  { viewer, dataSources: { userService } },
  info
) => {
  if (!userName || BLOCK_USERS.includes(userName)) {
    return
  }
  return userService.findByUserName(userName)
}

export default resolver
