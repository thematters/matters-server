import { UserInfoToAvatarResolver } from 'definitions'

const resolver: UserInfoToAvatarResolver = async (
  { avatar },
  _,
  { dataSources: { systemService } }
) => {
  return avatar ? systemService.findAssetUrl(avatar) : null
}

export default resolver
