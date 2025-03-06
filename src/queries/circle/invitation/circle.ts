import type { GQLInvitationResolvers, Circle } from 'definitions/index.js'

const resolver: GQLInvitationResolvers['circle'] = async (
  { circleId },
  _,
  { dataSources: { atomService } }
) => atomService.circleIdLoader.load(circleId) as Promise<Circle>

export default resolver
