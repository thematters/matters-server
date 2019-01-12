import { QueryToFrequentSearchResolver, GQLNode } from 'definitions'

const resolver: QueryToFrequentSearchResolver = (
  _,
  { input },
  { dataSources: { systemService } }
) => systemService.frequentSearch(input)

export default resolver
