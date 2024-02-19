import type { GQLCircleResolvers } from 'definitions'

const resolver: GQLCircleResolvers['owner'] = async (
  { owner },
  _,
  { dataSources: { atomService } }
) => atomService.userIdLoader.load(owner)

export default resolver
