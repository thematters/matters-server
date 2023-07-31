import type { GQLOAuthClientResolvers } from 'definitions'

const resolver: GQLOAuthClientResolvers['avatar'] = async (
  { avatar },
  _,
  { dataSources: { systemService } }
) => (avatar ? systemService.findAssetUrl(avatar) : null)

export default resolver
