import { QueryToUserResolver } from 'definitions'

const resolver: QueryToUserResolver = async (
  root,
  { input: { userName, ethAddress } },
  { viewer, dataSources: { userService } },
  info
) => {
  if (!userName || !ethAddress) {
    return
  }

  if (userName) {
    return userService.findByUserName(userName)
  } else {
    return userService.findByEthAddress(ethAddress)
  }
}

export default resolver
