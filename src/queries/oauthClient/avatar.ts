import { OAuthClientToAvatarResolver } from 'definitions'

const resolver: OAuthClientToAvatarResolver = async (
  { avatar },
  _,
  { dataSources: { systemService } }
) => {
  return avatar ? systemService.findAssetUrl(avatar) : null
}

export default resolver
