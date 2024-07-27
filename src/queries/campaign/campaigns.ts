import type { GQLQueryResolvers } from 'definitions'

import { ForbiddenError } from 'common/errors'
import { connectionFromArray, fromConnectionArgs } from 'common/utils'

const resolver: GQLQueryResolvers['campaigns'] = async (
  _,
  { input },
  { viewer, dataSources: { campaignService } }
) => {
  const { oss } = input
  const { take, skip } = fromConnectionArgs(input)
  if (oss) {
    if (!viewer.hasRole('admin')) {
      throw new ForbiddenError('only admin can access oss')
    }
    const [campaigns, totalCount] = await campaignService.findAndCountAll(
      { take, skip },
      { filterStates: undefined }
    )
    return connectionFromArray(campaigns, input, totalCount)
  } else {
    const [campaigns, totalCount] = await campaignService.findAndCountAll({
      take,
      skip,
    })
    return connectionFromArray(campaigns, input, totalCount)
  }
}

export default resolver
