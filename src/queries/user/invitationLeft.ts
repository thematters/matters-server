import { AuthenticationError } from 'apollo-server'
import { InvitationStatusToLeftResolver } from 'definitions'

const resolver: InvitationStatusToLeftResolver = async (
  { id },
  _,
  { viewer, dataSources: { userService } }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('anonymous user cannot do this')
  }

  if (viewer.id !== id && viewer.role !== 'admin') {
    throw Error('Not authorized')
  }

  const invitionCount = await userService.countInvitation(id)
  const mat = await userService.totalMAT(id)
  return Math.max(Math.floor(Math.log(mat)) - invitionCount, 0)
}

export default resolver
