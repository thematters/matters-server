import { CacheScope } from 'apollo-cache-control'

import { CACHE_TTL } from 'common/enums/index.js'
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
      scope: CacheScope.Private,
    })
    return userService.findByEthAddress(ethAddress)
  }
}

export default resolver
