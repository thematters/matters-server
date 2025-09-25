import type { GQLQueryResolvers, ValueOf } from '#definitions/index.js'

import { CAMPAIGN_STATE } from '#common/enums/index.js'
import { ForbiddenError, UserInputError } from '#common/errors.js'
import { connectionFromArray, fromConnectionArgs } from '#common/utils/index.js'

const resolver: GQLQueryResolvers['campaigns'] = async (
  _,
  { input },
  { viewer, dataSources: { campaignService } }
) => {
  const { oss, filter } = input
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
    const validStates = [CAMPAIGN_STATE.active, CAMPAIGN_STATE.finished]
    // validate if filter.state has passed
    if (
      filter?.state &&
      (typeof filter.state !== 'string' || !validStates.includes(filter.state))
    ) {
      throw new UserInputError('invalid filter state')
    }

    const hasValidFilterState =
      filter?.state &&
      typeof filter.state === 'string' &&
      validStates.includes(filter.state)

    const [campaigns, totalCount] = await campaignService.findAndCountAll(
      {
        take,
        skip,
      },
      hasValidFilterState
        ? {
            filterStates: [filter.state as ValueOf<typeof CAMPAIGN_STATE>],
            filterSort: filter?.sort || undefined,
          }
        : undefined
    )
    return connectionFromArray(campaigns, input, totalCount)
  }
}

export default resolver
