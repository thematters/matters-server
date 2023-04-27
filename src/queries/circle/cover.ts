import { CircleToCoverResolver } from 'definitions'

const resolver: CircleToCoverResolver = async (
  { cover },
  _,
  { dataSources: { systemService } }
) => {
  return cover ? systemService.findAssetUrl(cover) : null
}

export default resolver
