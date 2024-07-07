import type { GQLWritingChallengeResolvers } from 'definitions'

const resolver: GQLWritingChallengeResolvers['applicationState'] = async (
  { id },
  _,
  { viewer, dataSources: { atomService } }
) => {
  if (!viewer.id) {
    return null
  }
  const applicationState = await atomService.findFirst({
    table: 'campaign_user',
    where: { userId: viewer.id, campaignId: id },
  })

  return applicationState?.state ?? null
}

export default resolver
