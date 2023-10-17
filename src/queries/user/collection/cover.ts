import type { GQLCollectionResolvers } from 'definitions'

const resolver: GQLCollectionResolvers['cover'] = async (
  { cover },
  _,
  { dataSources: { systemService } }
) => {
  return cover ? systemService.findAssetUrl(cover) : null
}

export default resolver
