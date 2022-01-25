import { CACHE_TTL } from 'common/enums'
import { QueryToUserResolver } from 'definitions'

const resolver: QueryToUserResolver = async (
  root,
  { input: { userName, ethAddress } },
  { viewer, dataSources: { userService } },
  { cacheControl }
) => {
  if (!userName && !ethAddress) {
    return
  }

  if (userName) {
    return userService.findByUserName(userName)
  } else if (ethAddress) {
    cacheControl.setCacheHint({
      maxAge: CACHE_TTL.INSTANT,
    })
    return userService.findByEthAddress(ethAddress)
  }
}

export default resolver
