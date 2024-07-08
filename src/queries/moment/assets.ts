import type { GQLMomentResolvers } from 'definitions'

const resolver: GQLMomentResolvers['assets'] = async (
  { id },
  _,
  { dataSources: { momentService } }
) => momentService.getAssets(id)

export default resolver
