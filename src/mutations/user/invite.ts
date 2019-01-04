import { Resolver } from 'definitions'
import { fromGlobalId } from 'common/utils'
import { MAT } from 'common/enums'

const resolver: Resolver = async (
  _,
  { input: { id, email } },
  { viewer, dataSources: { userService } }
) => {
  if (!viewer.id) {
    throw new Error('anonymous user cannot do this') // TODO
  }

  if (!id && !email) {
    throw new Error('id or email is required') // TODO
  }

  const isAdmin = viewer.role === 'admin'
  if (!isAdmin) {
    const invited = await userService.findInvitations({ userId: viewer.id })
    const invitationLeft =
      Math.floor(viewer.mat / MAT.invitationCalculate) - invited.length

    if (viewer.state !== 'active' || invitationLeft <= 0) {
      throw new Error('unable to invite') // TODO
    }
  }

  if (id) {
    const { id: dbId } = fromGlobalId(id)
    const recipient = await userService.dataloader.load(dbId)
    if (!recipient) {
      throw new Error('target user does not exists') // TODO
    }
    if (recipient.state !== 'onboarding') {
      throw new Error("target user' state is not onboarding")
    }
    await userService.activate({
      senderId: isAdmin ? undefined : viewer.id,
      senderMAT: isAdmin ? undefined : viewer.mat,
      recipientId: recipient.id,
      recipientMAT: recipient.mat
    })
  } else {
    const user = await userService.findByEmail(email)
    if (user) {
      throw new Error('email has been registered')
    }
    await userService.invite({
      senderId: isAdmin ? undefined : viewer.id,
      email
    })
  }

  return true
}

export default resolver
