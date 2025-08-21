import type { GQLMomentResolvers } from '#definitions/index.js'

const resolver: GQLMomentResolvers['articles'] = async (
  { id },
  _,
  { dataSources: { momentService } }
) => momentService.getArticles(id)

export default resolver
