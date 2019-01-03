import { Resolver } from 'definitions'

const resolver: Resolver = async (
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
