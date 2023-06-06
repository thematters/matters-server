import { CircleToCoverResolver } from 'definitions'

const resolver: CircleToCoverResolver = async (
  { cover },
  _,
  { dataSources: { systemService } }
) => (cover ? systemService.findAssetUrl(cover) : null)

export default resolver
