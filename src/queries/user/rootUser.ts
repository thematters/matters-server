import { cacheControlFromInfo } from '@apollo/cache-control-types'

import { CACHE_TTL } from 'common/enums'
import { QueryToUserResolver } from 'definitions'

const resolver: QueryToUserResolver = async (
  _,
  { input: { userName, ethAddress } },
  { dataSources: { userService } },
  info
) => {
  if (!userName && !ethAddress) {
    return
  }

  if (userName) {
    return userService.findByUserName(userName)
  } else if (ethAddress) {
    cacheControlFromInfo(info).setCacheHint({
      maxAge: CACHE_TTL.INSTANT,
      scope: 'PRIVATE',
    })
    return userService.findByEthAddress(ethAddress)
  }
}

export default resolver
