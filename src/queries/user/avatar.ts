import type { GQLUserResolvers } from '#definitions/index.js'

const resolver: GQLUserResolvers['avatar'] = async (
  { avatar },
  _,
  { dataSources: { systemService } }
) => (avatar ? systemService.findAssetUrl(avatar) : null)

export default resolver
