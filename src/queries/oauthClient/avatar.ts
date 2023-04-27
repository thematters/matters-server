import { isTarget } from 'common/utils'
import { OAuthClientToAvatarResolver } from 'definitions'

const resolver: OAuthClientToAvatarResolver = async (
  { avatar },
  _,
  { dataSources: { systemService }, req, viewer }
) => {
  return avatar
    ? systemService.findAssetUrl(avatar, !isTarget(req, viewer))
    : null
}

export default resolver
