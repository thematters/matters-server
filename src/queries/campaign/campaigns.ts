import type { GQLQueryResolvers } from 'definitions/index.js'

import { ForbiddenError } from 'common/errors.js'
import { connectionFromArray, fromConnectionArgs } from 'common/utils/index.js'

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
