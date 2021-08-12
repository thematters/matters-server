import Knex from 'knex'

import { PAYMENT_PROVIDER, PRICE_STATE, SUBSCRIPTION_STATE } from 'common/enums'
import { CircleSubscriberAnalyticsToInviteeHistoryResolver } from 'definitions'

const resolver: CircleSubscriberAnalyticsToInviteeHistoryResolver = async (
  { id },
  _,
  { dataSources: { atomService }, knex }
) => {
  const take = 4

  const selectPastMonth = (month: number) =>
    knex.raw(
      `select date_trunc('month', current_date - interval '${month}' month) as date`
    )
  const result = await knex
    .with('last_4_months', (builder) => {
      builder
        .select()
        .union([
          selectPastMonth(3),
          selectPastMonth(2),
          selectPastMonth(1),
          selectPastMonth(0),
        ])
        .orderBy('date', 'asc')
    })
    .select('date')
    .select(knex.raw(`sum(value) OVER (ORDER BY date asc) AS value`))
    .from((builder: Knex.QueryBuilder) => {
      builder
        .select(knex.raw(`coalesce(date, group_month) as date`))
        .select(knex.raw(`coalesce(group_count, 0) as value`))
        .from('last_4_months')
        .fullOuterJoin(
          knex
            .select(knex.raw(`date_trunc('month', created_at) as group_month`))
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
            .groupBy('group_month')
            .as('history'),
          'history.group_month',
          'last_4_months.date'
        )
        .as('joined_history')
    })
    .as('cumsum_history')

  return result.slice(take * -1)
}

export default resolver
