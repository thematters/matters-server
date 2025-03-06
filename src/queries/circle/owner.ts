import type { GQLCircleResolvers } from '#definitions/index.js'

const resolver: GQLCircleResolvers['owner'] = async (
  { owner },
  _,
  { dataSources: { atomService } }
) => atomService.userIdLoader.load(owner)

export default resolver
