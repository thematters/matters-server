import type { GQLUserResolvers } from 'definitions'

import { CAMPAIGN_STATE } from 'common/enums'
import { connectionFromArray, fromConnectionArgs } from 'common/utils'

const resolver: GQLUserResolvers['campaigns'] = async (
  { id },
  { input },
  { dataSources: { campaignService } }
) => {
  if (!id) {
    return connectionFromArray([], input, 0)
  }

  const { take, skip } = fromConnectionArgs(input)
  const [campaigns, totalCount] = await campaignService.findAndCountAll(
    {
      take,
      skip,
    },
    {
      filterUserId: id,
      filterStates: [CAMPAIGN_STATE.active],
    }
  )
  return connectionFromArray(campaigns, input, totalCount)
}

export default resolver
