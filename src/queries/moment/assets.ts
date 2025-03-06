import type { GQLMomentResolvers } from 'definitions/index.js'

const resolver: GQLMomentResolvers['assets'] = async (
  { id },
  _,
  { dataSources: { momentService } }
) => momentService.getAssets(id)

export default resolver
