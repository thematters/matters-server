import { CircleToCoverResolver } from 'definitions'

const resolver: CircleToCoverResolver = async (
  { cover },
  _,
  { dataSources: { atomService } }
) => {
  return cover ? atomService.findAssetUrl({ where: { id: cover } }) : null
}

export default resolver
