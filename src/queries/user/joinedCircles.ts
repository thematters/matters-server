import { PRICE_STATE, SUBSCRIPTION_STATE } from 'common/enums'
import { UserToJoinedCirclesResolver } from 'definitions'

const resolver: UserToJoinedCirclesResolver = async (
  { id },
  _,
  { dataSources: { atomService }, knex }
) => {
  if (!id) {
    return []
  }

  const circleIds = await knex
    .select('price.circle_id')
    .from('circle_subscription_item as csi')
    .join('circle_price', 'pirce.id', 'csi.price_id')
    .join('circle_subscription as cs', 'cs.id', 'csi.subscription_id')
    .where({
      'cs.state': SUBSCRIPTION_STATE.active,
      'csi.user_id': id,
      'circle_price.state': PRICE_STATE.active,
    })

  const circles = await atomService.circleIdLoader.loadMany(
    circleIds.map(({ circleId }) => circleId)
  )

  return circles
}

export default resolver
