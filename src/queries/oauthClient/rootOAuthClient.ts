import type { GQLQueryResolvers } from 'definitions/index.js'

const resolver: GQLQueryResolvers['oauthClient'] = async (
  root,
  { input: { id } },
  { viewer, dataSources: { oauthService } }
) => oauthService.findClient({ clientId: id })

export default resolver
