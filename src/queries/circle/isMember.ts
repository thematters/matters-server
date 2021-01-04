import { PRICE_STATE } from 'common/enums'
import { CircleToIsMemberResolver } from 'definitions'

const resolver: CircleToIsMemberResolver = async (
  { id },
  _,
  { viewer, dataSources: { atomService }, knex }
) => {
  if (!viewer.id) {
    return false
  }

  const records = await knex
    .select()
    .from('circle_subscription_item as csi')
    .innerJoin('price', 'pirce.id', 'csi.price_id')
    .where({
      'csi.user_id': viewer.id,
      'csi.circle_id': id,
      'price.state': PRICE_STATE.active,
    })

  return records && records.length > 0
}

export default resolver
