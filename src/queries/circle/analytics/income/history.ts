import type { GQLCircleIncomeAnalyticsResolvers } from 'definitions'

import {
  PAYMENT_PROVIDER,
  PRICE_STATE,
  TRANSACTION_PURPOSE,
  TRANSACTION_STATE,
  TRANSACTION_TARGET_TYPE,
} from 'common/enums'

const resolver: GQLCircleIncomeAnalyticsResolvers['history'] = async (
  { id, owner },
  _,
  { dataSources: { atomService, systemService }, knex }
) => {
  const [{ id: entityTypeId }, price] = await Promise.all([
    systemService.baseFindEntityTypeId(TRANSACTION_TARGET_TYPE.circlePrice),
    atomService.findFirst({
      table: 'circle_price',
      where: { circleId: id, state: PRICE_STATE.active },
    }),
  ])

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
    .select(knex.raw(`coalesce(group_amount, 0) as value`))
    .from('last_4_months')
    .leftJoin(
      knex
        .select(knex.raw(`date_trunc('month', created_at) as group_month`))
        .sum('amount as group_amount')
        .from('transaction')
        .where({
          state: TRANSACTION_STATE.succeeded,
          purpose: TRANSACTION_PURPOSE.subscriptionSplit,
          provider: PAYMENT_PROVIDER.matters,
          recipientId: owner,
          targetType: entityTypeId,
          targetId: price.id,
        })
        .groupBy('group_month')
        .as('history'),
      'history.group_month',
      'last_4_months.date'
    )

  return result
}

export default resolver
