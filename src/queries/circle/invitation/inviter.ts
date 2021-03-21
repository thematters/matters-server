import { InvitationToInviterResolver } from 'definitions'

const resolver: InvitationToInviterResolver = async (
  { inviter },
  _,
  { dataSources: { atomService } }
) => (inviter ? atomService.userIdLoader.load(inviter) : null)

export default resolver
