import type { GQLWritingChallengeResolvers } from 'definitions'

const resolver: GQLWritingChallengeResolvers['application'] = async (
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

  return applicationState
    ? {
        state: applicationState.state,
        createdAt: applicationState.createdAt,
      }
    : null
}

export default resolver
