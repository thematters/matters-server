import type { GQLMemberResolvers } from '#definitions/index.js'

import { PRICE_STATE } from '#common/enums/index.js'

const resolver: GQLMemberResolvers['price'] = async (
  { id, circleId },
  _,
  {
    dataSources: {
      connections: { knex },
    },
  }
) => {
  if (!id || !circleId) {
    return null
  }

  const price = await knex
    .select()
    .from('circle_price as cp')
    .join('circle_subscription_item as csi', 'csi.price_id', 'cp.id')
    .where({
      'cp.circle_id': circleId,
      'cp.state': PRICE_STATE.active,
      'csi.user_id': id,
      'csi.archived': false,
    })
    .first()

  return price
}

export default resolver
