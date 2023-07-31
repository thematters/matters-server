import type { GQLPriceResolvers } from 'definitions'

const resolver: GQLPriceResolvers['circle'] = async (
  { circle_id },
  _,
  { viewer, dataSources: { atomService } }
) => (circle_id ? atomService.circleIdLoader.load(circle_id) : null)

export default resolver
