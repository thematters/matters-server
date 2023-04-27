import { isTarget } from 'common/utils'
import { CircleToAvatarResolver } from 'definitions'

const resolver: CircleToAvatarResolver = async (
  { avatar },
  _,
  { dataSources: { systemService }, req, viewer }
) => {
  return avatar
    ? systemService.findAssetUrl(avatar, !isTarget(req, viewer))
    : null
}

export default resolver
