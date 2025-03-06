import type { GQLCircleResolvers } from 'definitions/index.js'

const resolver: GQLCircleResolvers['avatar'] = async (
  { avatar },
  _,
  { dataSources: { systemService } }
) => (avatar ? systemService.findAssetUrl(avatar) : null)

export default resolver
