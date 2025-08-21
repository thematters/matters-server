import type { GQLMomentResolvers } from '#definitions/index.js'

const resolver: GQLMomentResolvers['tags'] = async (
  { id },
  _,
  { dataSources: { momentService } }
) => momentService.getTags(id)

export default resolver
