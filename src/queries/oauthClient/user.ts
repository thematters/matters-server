import { OAuthClientToUserResolver } from 'definitions'

const resolver: OAuthClientToUserResolver = async (
  { userId },
  _,
  { dataSources: { userService } }
) => {
  return userId ? userService.dataloader.load(userId) : null
}

export default resolver
