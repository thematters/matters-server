import type { GQLInvitationResolvers, Circle } from 'definitions'

const resolver: GQLInvitationResolvers['circle'] = async (
  { circleId },
  _,
  { dataSources: { atomService } }
) => atomService.circleIdLoader.load(circleId) as Promise<Circle>

export default resolver
