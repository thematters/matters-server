import type { GQLWritingChallengeResolvers } from '#definitions/index.js'

const resolver: GQLWritingChallengeResolvers['channelEnabled'] = async (
  { id },
  _,
  { dataSources: { atomService } }
) => {
  const channel = await atomService.findFirst({
    table: 'campaign_channel',
    where: { campaignId: id },
  })
  return channel?.enabled ?? false
}

export default resolver
