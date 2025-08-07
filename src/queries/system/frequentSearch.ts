import type { GQLQueryResolvers } from '#definitions/index.js'

const resolver: GQLQueryResolvers['frequentSearch'] = (
  _,
  { input },
  { dataSources: { searchService } }
) => (input.key === '' ? null : searchService.findFrequentSearches(input))

export default resolver
