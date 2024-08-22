import type { GQLWritingChallengeResolvers } from 'definitions'

const resolver: GQLWritingChallengeResolvers['announcements'] = async (
  { id },
  _,
  { dataSources: { campaignService } }
) => campaignService.findAnnouncements(id)

export default resolver
