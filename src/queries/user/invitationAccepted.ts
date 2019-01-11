import { InvitationToAcceptedResolver } from 'definitions'

const resolver: InvitationToAcceptedResolver = async (
  { status },
  _,
  { viewer, dataSources: { userService } }
) => status === 'activated'

export default resolver
