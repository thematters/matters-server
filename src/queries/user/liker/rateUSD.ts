import { getLogger } from 'common/logger'
import { LikerToRateUSDResolver } from 'definitions'

const logger = getLogger('query-rate-usd')

const resolver: LikerToRateUSDResolver = async (
  _,
  __: any,
  { dataSources: { userService } }
) => {
  try {
    const price = await userService.likecoin.rate()

    return price
  } catch (e) {
    logger.error(e)
    return null
  }
}

export default resolver
