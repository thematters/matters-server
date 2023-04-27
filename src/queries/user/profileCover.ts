import { isTarget } from 'common/utils'
import { UserInfoToProfileCoverResolver } from 'definitions'

const resolver: UserInfoToProfileCoverResolver = async (
  { profileCover },
  _,
  { dataSources: { systemService }, req, viewer }
) => {
  return profileCover
    ? systemService.findAssetUrl(profileCover, !isTarget(req, viewer))
    : null
}

export default resolver
