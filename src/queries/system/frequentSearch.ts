import { QueryToFrequentSearchResolver } from 'definitions'

const resolver: QueryToFrequentSearchResolver = (
  _,
  { input },
  { dataSources: { systemService } }
) => {
  if (input.key === '') {
    return null
  } else {
    return systemService.frequentSearch(input)
  }
}

export default resolver
