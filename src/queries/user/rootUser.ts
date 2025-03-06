import type { GQLQueryResolvers } from 'definitions/index.js'

import { cacheControlFromInfo } from '@apollo/cache-control-types'

import { CACHE_TTL } from 'common/enums/index.js'
import { UserInputError } from 'common/errors.js'

const resolver: GQLQueryResolvers['user'] = async (
  _,
  { input: { userName, userNameCaseIgnore, ethAddress } },
  { dataSources: { userService } },
  info
) => {
  if (!userName && !ethAddress) {
    throw new UserInputError('userName or ethAddress is required')
  }

  if (userName) {
    return userService.findByUserName(userName, userNameCaseIgnore)
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
