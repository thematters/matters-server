import type { GQLQueryResolvers } from 'definitions'

const resolver: GQLQueryResolvers['frequentSearch'] = (
  _,
  { input },
  { dataSources: { systemService } }
) => (input.key === '' ? null : systemService.frequentSearch(input))

export default resolver
