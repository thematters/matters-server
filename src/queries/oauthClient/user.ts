import { OAuthClientToUserResolver } from 'definitions'

const resolver: OAuthClientToUserResolver = async (
  { userId },
  _,
  { dataSources: { userService } }
) => (userId ? userService.dataloader.load(userId) : null)

export default resolver
