import { QueryToOauthClientResolver } from 'definitions'

const resolver: QueryToOauthClientResolver = async (
  root,
  { input: { id } },
  { viewer, dataSources: { oauthService } }
) => oauthService.findClient({ clientId: id })

export default resolver
