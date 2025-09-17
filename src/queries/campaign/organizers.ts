import type { GQLWritingChallengeResolvers } from '#definitions/index.js'

const resolver: GQLWritingChallengeResolvers['organizers'] = async (
  { organizerIds },
  _,
  { dataSources: { atomService } }
) => {
  if (!organizerIds) {
    return []
  }
  return atomService.userIdLoader.loadMany(organizerIds)
}
export default resolver
