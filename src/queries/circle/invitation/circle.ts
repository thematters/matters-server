import { InvitationToCircleResolver } from 'definitions'

const resolver: InvitationToCircleResolver = async (
  { circle_id },
  _,
  { dataSources: { atomService } }
) => (circle_id ? atomService.circleIdLoader.load(circle_id) : null)

export default resolver
