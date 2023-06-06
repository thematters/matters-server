import { UserToAvatarResolver } from 'definitions'

const resolver: UserToAvatarResolver = async (
  { avatar },
  _,
  { dataSources: { systemService } }
) => (avatar ? systemService.findAssetUrl(avatar) : null)

export default resolver
