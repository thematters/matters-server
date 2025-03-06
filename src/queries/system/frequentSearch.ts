import type { GQLQueryResolvers } from 'definitions/index.js'

const resolver: GQLQueryResolvers['frequentSearch'] = (
  _,
  { input },
  { dataSources: { systemService } }
) => (input.key === '' ? null : systemService.frequentSearch(input))

export default resolver
