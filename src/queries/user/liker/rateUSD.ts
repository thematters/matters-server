import type { GQLLikerResolvers } from 'definitions'

import { getLogger } from 'common/logger'

const logger = getLogger('query-rate-usd')

const resolver: GQLLikerResolvers['rateUSD'] = async (
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
