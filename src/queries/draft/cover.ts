import { DraftToCoverResolver } from 'definitions'

const resolver: DraftToCoverResolver = async (
  { cover },
  _,
  { dataSources: { systemService } }
) => {
  return cover ? systemService.findAssetUrl(cover) : null
}

export default resolver
