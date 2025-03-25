import type { GQLCollectionResolvers } from '#definitions/index.js'

const resolver: GQLCollectionResolvers['cover'] = async (
  { cover },
  _,
  { dataSources: { systemService } }
) => {
  return cover ? systemService.findAssetUrl(cover) : null
}

export default resolver
