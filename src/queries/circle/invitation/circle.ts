import { InvitationToCircleResolver } from 'definitions'

const resolver: InvitationToCircleResolver = async (
  { circleId },
  _,
  { dataSources: { atomService } }
) => (circleId ? atomService.circleIdLoader.load(circleId) : null)

export default resolver
