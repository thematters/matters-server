import type { GQLCircleResolvers } from 'definitions/index.js'

const resolver: GQLCircleResolvers['cover'] = async (
  { cover },
  _,
  { dataSources: { systemService } }
) => (cover ? systemService.findAssetUrl(cover) : null)

export default resolver
