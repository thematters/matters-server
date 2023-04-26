import { UserInfoToProfileCoverResolver } from 'definitions'

const resolver: UserInfoToProfileCoverResolver = async (
  { profileCover },
  _,
  { dataSources: { systemService } }
) => (profileCover ? systemService.findAssetUrl(profileCover) : null)

export default resolver
