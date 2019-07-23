import { QueryToUserResolver } from 'definitions'

import { BLOCK_USERS } from 'common/enums'

const resolver: QueryToUserResolver = async (
  root,
  { input: { userName } },
  { viewer, dataSources: { userService } }
) => {
  if (!userName || BLOCK_USERS.includes(userName)) {
    return
  }

  return userService.findByUserName(userName)
}

export default resolver
