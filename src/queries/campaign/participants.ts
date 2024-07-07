import type { GQLWritingChallengeResolvers } from 'definitions'

import { connectionFromArray, fromConnectionArgs } from 'common/utils'

const resolver: GQLWritingChallengeResolvers['participants'] = async (
  { id },
  { input },
  { dataSources: { campaignService } }
) => {
  const { take, skip } = fromConnectionArgs(input)
  const [participants, totalCount] = await campaignService.findParticipants(
    id,
    { take, skip }
  )
  return connectionFromArray(participants, input, totalCount)
}

export default resolver
