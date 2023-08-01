import type { GQLPriceResolvers, Circle } from 'definitions'

const resolver: GQLPriceResolvers['circle'] = async (
  { circleId },
  _,
  { dataSources: { atomService } }
) => atomService.circleIdLoader.load(circleId) as Promise<Circle>

export default resolver
