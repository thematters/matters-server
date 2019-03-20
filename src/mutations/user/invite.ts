import {
  AuthenticationError,
  UserInputError,
  EmailExistsError,
  UserInviteFailedError,
  UserInviteStateFailedError,
  UserNotFoundError,
  UserInviteEmailInvitedFailedError
} from 'common/errors'
import { MutationToInviteResolver } from 'definitions'
import { fromGlobalId } from 'common/utils'
import { MAT_UNIT } from 'common/enums'

const resolver: MutationToInviteResolver = async (
  _,
  { input: { id, email } },
  { viewer, dataSources: { userService, notificationService } }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  if (!id && !email) {
    throw new UserInputError('id or email is required')
  }

  // check sender
  const isAdmin = viewer.hasRole('admin')
  if (!isAdmin) {
    const invited = await userService.findInvitations(viewer.id)
    const viewerTotalMAT = await userService.totalMAT(viewer.id)
    const invitationLeft =
      Math.floor(viewerTotalMAT / MAT_UNIT.invitationCalculate) - invited.length

    if (viewer.state !== 'active' || invitationLeft <= 0) {
      throw new UserInviteFailedError('unable to invite')
    }
  }

  if (id) {
    const { id: dbId } = fromGlobalId(id)
    const recipient = await userService.dataloader.load(dbId)
    // check recipient
    if (!recipient) {
      throw new UserNotFoundError('target user does not exists')
    }
    if (recipient.state !== 'onboarding') {
      throw new UserInviteStateFailedError(
        "target user's state is not onboarding"
      )
    }
    // activate recipient
    await userService.activate({
      senderId: viewer.id,
      recipientId: recipient.id
    })

    // send email
    notificationService.mail.sendInvitationSuccess({
      to: email,
      recipient: {
        displayName: recipient.displayName
      },
      sender: isAdmin
        ? {}
        : {
            displayName: viewer.displayName,
            userName: viewer.userName
          },
      type: 'activation',
      language: recipient.language
    })

    // trigger notification
    const invitation = await userService.findInvitationByRecipientId(
      recipient.id
    )
    if (invitation) {
      notificationService.trigger({
        event: 'user_activated',
        entities: [
          {
            type: 'target',
            entityTable: 'invitation',
            entity: invitation
          }
        ],
        recipientId: recipient.id
      })
    }
  } else {
    const user = await userService.findByEmail(email)
    if (user) {
      throw new EmailExistsError('email has been registered')
    }

    // check if the email has been invited
    const isEmailInvited = await userService.findInvitationByEmail(email)
    if (isEmailInvited) {
      throw new UserInviteEmailInvitedFailedError('email has been invited')
    }

    // invite email
    await userService.invite({
      senderId: viewer.id,
      email
    })

    // send email
    notificationService.mail.sendInvitationSuccess({
      to: email,
      sender: isAdmin
        ? {}
        : {
            displayName: viewer.displayName,
            userName: viewer.userName
          },
      type: 'invitation'
    })
  }

  return true
}

export default resolver
