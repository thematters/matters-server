import {
  PAYMENT_PROVIDER,
  PRICE_STATE,
  SUBSCRIPTION_STATE,
} from 'common/enums/index.js'
import { CircleSubscriberAnalyticsToCurrentInviteeResolver } from 'definitions'

const resolver: CircleSubscriberAnalyticsToCurrentInviteeResolver = async (
  { id },
  _,
  { knex }
) => {
  const record = await knex
    .count()
    .from('circle_subscription_item as csi')
    .join('circle_price', 'circle_price.id', 'csi.price_id')
    .join('circle_subscription as cs', 'cs.id', 'csi.subscription_id')
    .where({
      'circle_price.circle_id': id,
      'circle_price.state': PRICE_STATE.active,
      'csi.provider': PAYMENT_PROVIDER.matters,
      'csi.archived': false,
    })
    .whereIn('cs.state', [
      SUBSCRIPTION_STATE.active,
      SUBSCRIPTION_STATE.trialing,
    ])
    .first()

  return parseInt(record ? (record.count as string) : '0', 10)
}

export default resolver
