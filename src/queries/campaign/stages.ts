import type { GQLWritingChallengeResolvers } from 'definitions'

const resolver: GQLWritingChallengeResolvers['stages'] = async (
  { id },
  _,
  { dataSources: { atomService } }
) =>
  atomService.findMany({ table: 'campaign_stage', where: { campaignId: id } })

export default resolver
