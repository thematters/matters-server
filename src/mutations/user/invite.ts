import {
  AuthenticationError,
  UserInputError,
  EmailExistsError,
  UserInviteFailedError,
  UserInviteStateFailedError
} from 'common/errors'
import { MutationToInviteResolver } from 'definitions'
import { fromGlobalId } from 'common/utils'
import { MAT_UNIT } from 'common/enums'

const resolver: MutationToInviteResolver = async (
  _,
  { input: { id, email } },
  { viewer, dataSources: { userService } }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  if (!id && !email) {
    throw new UserInputError('id or email is required')
  }

  const isAdmin = viewer.role === 'admin'
  if (!isAdmin) {
    const invited = await userService.findInvitations(viewer.id)
    const invitationLeft =
      Math.floor(viewer.mat / MAT_UNIT.invitationCalculate) - invited.length

    if (viewer.state !== 'active' || invitationLeft <= 0) {
      throw new UserInviteFailedError('unable to invite')
    }
  }

  if (id) {
    const { id: dbId } = fromGlobalId(id)
    const recipient = await userService.dataloader.load(dbId)
    if (!recipient) {
      throw new UserInputError('target user does not exists')
    }
    if (recipient.state !== 'onboarding') {
      throw new UserInviteStateFailedError(
        "target user' state is not onboarding"
      )
    }
    await userService.activate({
      senderId: isAdmin ? undefined : viewer.id,
      recipientId: recipient.id
    })
  } else {
    const user = await userService.findByEmail(email)
    if (user) {
      throw new EmailExistsError('email has been registered')
    }
    await userService.invite({
      senderId: isAdmin ? undefined : viewer.id,
      email
    })
  }

  return true
}

export default resolver
