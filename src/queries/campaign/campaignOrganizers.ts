import type { GQLQueryResolvers } from '#definitions/index.js'

import { connectionFromArray, fromConnectionArgs } from '#common/utils/index.js'
import _sampleSize from 'lodash/sampleSize.js'

const resolver: GQLQueryResolvers['campaignOrganizers'] = async (
  _,
  { input },
  { viewer, dataSources: { atomService, campaignService } }
) => {
  const { take, skip } = fromConnectionArgs(input)
  const records = await campaignService.findCampaignOrganizers({
    take: 999,
    skip,
  })
  const userIds = records.reduce((result, record) => {
    const ids = record.organizerIds
    return new Set([...result, ...ids])
  }, new Set())

  const pickedUserIds = _sampleSize([...userIds], take || 4)
  const users = await atomService.userIdLoader.loadMany(pickedUserIds)
  return connectionFromArray(users, input, users.length)
}

export default resolver
