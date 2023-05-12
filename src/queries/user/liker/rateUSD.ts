import _ from 'lodash'

import { getLogger } from 'common/logger'
import { LikerToRateUSDResolver } from 'definitions'
const logger = getLogger('default')

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
