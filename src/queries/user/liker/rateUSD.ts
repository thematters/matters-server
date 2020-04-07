import axiso from 'axios'
import _ from 'lodash'

import { HOUR } from 'common/enums'
import logger from 'common/logger'
import { LikerToRateUSDResolver } from 'definitions'

const CACHED = {
  price: null,
  expiredAt: 0
}
const EXPIRES_IN = HOUR * 1 // 1 hour

const resolver: LikerToRateUSDResolver = async (
  { id },
  __: any,
  { dataSources: { userService } }
) => {
  // hit from cache
  if (CACHED.price && CACHED.expiredAt >= Date.now()) {
    return CACHED.price
  }

  try {
    const price = await userService.likecoin.rate()

    // save to cache
    CACHED.price = price
    CACHED.expiredAt = Date.now() + EXPIRES_IN

    return price
  } catch (e) {
    logger.error(e)
    return null
  }
}

export default resolver
