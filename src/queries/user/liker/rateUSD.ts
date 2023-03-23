import _ from 'lodash'

import logger from 'common/logger.js'
import { LikerToRateUSDResolver } from 'definitions'

const resolver: LikerToRateUSDResolver = async (
  { id },
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
