import { CircleToAvatarResolver } from 'definitions'

const resolver: CircleToAvatarResolver = async (
  { avatar },
  _,
  { dataSources: { atomService } }
) => {
  return avatar ? atomService.findAssetUrl({ where: { id: avatar } }) : null
}

export default resolver
