import type { GQLInvitationResolvers } from 'definitions'

const resolver: GQLInvitationResolvers['circle'] = async (
  { circleId },
  _,
  { dataSources: { atomService } }
) => (circleId ? atomService.circleIdLoader.load(circleId) : null)

export default resolver
