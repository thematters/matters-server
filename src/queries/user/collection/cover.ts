import type { CollectionToCoverResolver } from 'definitions'

const resolver: CollectionToCoverResolver = async (
  { cover },
  _,
  { dataSources: { systemService } }
) => {
  return cover ? systemService.findAssetUrl(cover) : null
}

export default resolver
