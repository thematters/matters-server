import { LIKEToRateUSDResolver } from 'definitions'
import axiso from 'axios'
import _ from 'lodash'
import logger from 'common/logger'

const PRICE_API =
  'https://api.coingecko.com/api/v3/coins/likecoin?localization=false'

const CACHED = {
  price: null,
  expiredAt: 0
}
const EXPIRES_IN = 1000 * 60 * 60 // 1 hour

const resolver: LIKEToRateUSDResolver = async (
  { id },
  __: any,
  { dataSources: { userService } }
) => {
  // hit from cache
  if (CACHED.price && CACHED.expiredAt >= Date.now()) {
    return CACHED.price
  }

  try {
    const res = await axiso.get(PRICE_API)
    const price = _.get(res, 'data.market_data.current_price.usd', null)

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
