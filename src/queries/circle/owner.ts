import type { GQLCircleResolvers } from 'definitions'

const resolver: GQLCircleResolvers['owner'] = async (
  { owner },
  _,
  { dataSources: { userService } }
) => userService.loadById(owner)

export default resolver
