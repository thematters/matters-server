import { CircleToCoverResolver } from 'definitions'

const resolver: CircleToCoverResolver = async (
  { avatar },
  _,
  { dataSources: { atomService } }
) => {
  return avatar ? atomService.findAssetUrl({ where: { id: avatar } }) : null
}

export default resolver
