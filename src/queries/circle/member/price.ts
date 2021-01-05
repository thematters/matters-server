import { PRICE_STATE } from 'common/enums'
import { MemberToPriceResolver } from 'definitions'

const resolver: MemberToPriceResolver = async (
  { id, circleId },
  _,
  { knex }
) => {
  if (!id || !circleId) {
    return null
  }

  const price = await knex
    .select()
    .from('circle_price as cp')
    .innerJoin('circle_subscription_item as csi', 'csi.price_id', 'cp.id')
    .where({
      'cp.circle_id': circleId,
      'cp.state': PRICE_STATE.active,
      'csi.user_id': id,
    })
    .first()

  return price
}

export default resolver
