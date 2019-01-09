import { InvitationToUserResolver } from 'definitions'

const resolver: InvitationToUserResolver = async (
  { recipientId },
  _,
  { viewer, dataSources: { userService } }
) => {
  if (!recipientId) {
    return
  }
  return userService.dataloader.load(recipientId)
}

export default resolver
