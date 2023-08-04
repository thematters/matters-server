import type { GQLOAuthClientResolvers } from 'definitions'

const resolver: GQLOAuthClientResolvers['user'] = async (
  { userId },
  _,
  { dataSources: { userService } }
) => (userId ? userService.loadById(userId) : null)

export default resolver
