import type { Customer, GQLWalletResolvers } from 'definitions'

import { PAYMENT_PROVIDER, PRICE_STATE, SUBSCRIPTION_STATE } from 'common/enums'

const resolver: GQLWalletResolvers['customerPortal'] = async (
  { id },
  _,
  {
    dataSources: {
      paymentService,
      connections: { knex },
    },
  }
) => {
  const where = {
    'csi.user_id': id,
    'csi.archived': false,
    'circle_price.state': PRICE_STATE.active,
  }
  const record = await knex
    .count()
    .from('circle_subscription_item as csi')
    .join('circle_price', 'circle_price.id', 'csi.price_id')
    .join('circle_subscription as cs', 'cs.id', 'csi.subscription_id')
    .where(where)
    .whereIn('cs.state', [
      SUBSCRIPTION_STATE.active,
      SUBSCRIPTION_STATE.trialing,
      SUBSCRIPTION_STATE.unpaid,
      SUBSCRIPTION_STATE.pastDue,
      SUBSCRIPTION_STATE.incomplete,
      SUBSCRIPTION_STATE.incompleteExpired,
    ])
    .first()
  const subCount = parseInt(record ? (record.count as string) : '0', 10)

  // open if viewer has non-canceled subscriptions
  if (subCount <= 0) {
    return null
  }

  // retrieve customer
  const customer = (await knex
    .select()
    .from('customer')
    .where({
      userId: id,
      provider: PAYMENT_PROVIDER.stripe,
      archived: false,
    })
    .first()) as Customer

  if (!customer) {
    return null
  }

  const customerId = customer.customerId
  return paymentService.stripe.getCustomerPortal({
    customerId,
  }) as Promise<string>
}

export default resolver
