import type { GQLQueryResolvers } from 'definitions'

import { cacheControlFromInfo } from '@apollo/cache-control-types'

import { CACHE_TTL } from 'common/enums'
import { UserInputError } from 'common/errors'

const resolver: GQLQueryResolvers['user'] = async (
  _,
  { input: { userName, ethAddress } },
  { dataSources: { userService } },
  info
) => {
  if (!userName && !ethAddress) {
    throw new UserInputError('userName or ethAddress is required')
  }

  if (userName) {
    return userService.findByUserName(userName)
  } else if (ethAddress) {
    cacheControlFromInfo(info).setCacheHint({
      maxAge: CACHE_TTL.INSTANT,
      scope: 'PRIVATE',
    })
    return userService.findByEthAddress(ethAddress)
  } else {
    return null
  }
}

export default resolver
