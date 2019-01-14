import { InvitationToAcceptedResolver } from 'definitions'
import { INVITATION_STATUS } from 'common/enums'

const resolver: InvitationToAcceptedResolver = async (
  { status },
  _,
  { viewer, dataSources: { userService } }
) => status === INVITATION_STATUS.activated

export default resolver
