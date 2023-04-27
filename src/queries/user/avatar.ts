import { isTarget } from 'common/utils'
import { UserToAvatarResolver } from 'definitions'

const resolver: UserToAvatarResolver = async (
  { avatar },
  _,
  { dataSources: { systemService }, req, viewer }
) => {
  return avatar
    ? systemService.findAssetUrl(avatar, !isTarget(req, viewer))
    : null
}

export default resolver
