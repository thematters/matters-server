import type { GQLCircleIncomeAnalyticsResolvers } from 'definitions'

import {
  INVITATION_STATE,
  PAYMENT_PROVIDER,
  PRICE_STATE,
  SUBSCRIPTION_STATE,
} from 'common/enums'

const resolver: GQLCircleIncomeAnalyticsResolvers['nextMonth'] = async (
  { id },
  _,
  { dataSources: { atomService }, knex }
) => {
  const [price, stripeSubItems, trialEndSubItems] = await Promise.all([
    atomService.findFirst({
      table: 'circle_price',
      where: {
        circle_id: id,
        state: 'active',
      },
    }),
    knex
      .count()
      .from('circle_subscription_item as csi')
      .join('circle_price', 'circle_price.id', 'csi.price_id')
      .join('circle_subscription as cs', 'cs.id', 'csi.subscription_id')
      .where({
        'circle_price.circle_id': id,
        'circle_price.state': PRICE_STATE.active,
        'csi.provider': PAYMENT_PROVIDER.stripe,
        'csi.archived': false,
      })
      .whereIn('cs.state', [
        SUBSCRIPTION_STATE.active,
        SUBSCRIPTION_STATE.trialing,
      ])
      .first(),
    knex
      .count()
      .from(
        knex('circle_invitation')
          .select(
            '*',
            knex.raw(
              `accepted_at + duration_in_days * interval '1 day' AS ended_at`
            )
          )
          .where({ state: INVITATION_STATE.accepted })
          .whereNotNull('subscription_item_id')
          .as('expired_ivts')
      )
      .leftJoin(
        'circle_subscription_item as csi',
        'csi.id',
        'expired_ivts.subscription_item_id'
      )
      .leftJoin('circle_price', 'circle_price.id', 'csi.price_id')
      .where({
        'circle_price.circle_id': id,
        'circle_price.state': PRICE_STATE.active,
        'csi.provider': PAYMENT_PROVIDER.matters,
        'csi.archived': false,
      })
      .andWhere(
        'ended_at',
        '<',
        knex.raw(`date_trunc('month', current_date + interval '1' month)`)
      )
      .andWhere('ended_at', '>=', knex.raw(`date_trunc('month', current_date)`))
      .first(),
  ])

  const stripeCount = parseInt(
    stripeSubItems ? (stripeSubItems.count as string) : '0',
    10
  )
  const trialEndSubCount = parseInt(
    trialEndSubItems ? (trialEndSubItems.count as string) : '0',
    10
  )
  const priceAmount = parseInt(price.amount, 10)

  return (stripeCount + trialEndSubCount) * priceAmount
}

export default resolver
