import { PriceToCircleResolver } from 'definitions'

const resolver: PriceToCircleResolver = async (
  { circle_id },
  _,
  { viewer, dataSources: { atomService } }
) => (circle_id ? atomService.circleIdLoader.load(circle_id) : null)

export default resolver
