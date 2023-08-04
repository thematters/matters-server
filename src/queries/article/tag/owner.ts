import type { GQLTagResolvers } from 'definitions'

const resolver: GQLTagResolvers['owner'] = (
  { owner },
  _,
  { dataSources: { userService } }
) => (owner ? userService.loadById(owner) : null)

export default resolver
