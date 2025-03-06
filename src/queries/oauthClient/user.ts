import type { GQLOAuthClientResolvers } from 'definitions/index.js'

const resolver: GQLOAuthClientResolvers['user'] = async (
  { userId },
  _,
  { dataSources: { atomService } }
) => (userId ? atomService.userIdLoader.load(userId) : null)

export default resolver
