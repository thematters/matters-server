import type { GQLUserInfoResolvers } from '#definitions/index.js'

const resolver: GQLUserInfoResolvers['profileCover'] = async (
  { profileCover },
  _,
  { dataSources: { systemService } }
) => (profileCover ? systemService.findAssetUrl(profileCover) : null)

export default resolver
