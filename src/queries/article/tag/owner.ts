import type { GQLTagResolvers } from 'definitions'

const resolver: GQLTagResolvers['owner'] = (
  { owner },
  _,
  { dataSources: { atomService } }
) => (owner ? atomService.userIdLoader.load(owner) : null)

export default resolver
