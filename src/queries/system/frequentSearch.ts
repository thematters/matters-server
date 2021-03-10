import { QueryToFrequentSearchResolver } from 'definitions'

const resolver: QueryToFrequentSearchResolver = (
  _,
  { input },
  { dataSources: { systemService } }
) => systemService.frequentSearch(input)

export default resolver
