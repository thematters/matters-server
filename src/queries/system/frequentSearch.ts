import { QueryToFrequentSearchResolver } from 'definitions'

const resolver: QueryToFrequentSearchResolver = (
  _,
  { input },
  { dataSources: { systemService } }
) => (input.key === '' ? null : systemService.frequentSearch(input))

export default resolver
