import { ArticleToCoverResolver } from 'definitions'

const resolver: ArticleToCoverResolver = async (
  { cover },
  _,
  { dataSources: { systemService } }
) => {
  return cover ? systemService.findAssetUrl(cover) : null
}

export default resolver
