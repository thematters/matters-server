import Knex from 'knex'

import {
  PAYMENT_PROVIDER,
  PRICE_STATE,
  TRANSACTION_PURPOSE,
  TRANSACTION_STATE,
  TRANSACTION_TARGET_TYPE,
} from 'common/enums'
import { CircleIncomeAnalyticsToHistoryResolver } from 'definitions'

const resolver: CircleIncomeAnalyticsToHistoryResolver = async (
  { id, owner },
  _,
  { dataSources: { atomService, systemService }, knex }
) => {
  const take = 4

  const [{ id: entityTypeId }, price] = await Promise.all([
    systemService.baseFindEntityTypeId(TRANSACTION_TARGET_TYPE.circlePrice),
    atomService.findFirst({
      table: 'circle_price',
      where: { circleId: id, state: PRICE_STATE.active },
    }),
  ])

  const result = await knex
    .select()
    .from((builder: Knex.QueryBuilder) => {
      builder
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
        .limit(take)
        .groupBy('group_month')
        .orderBy('group_month', 'desc')
        .as('latest_history')
    })
    .orderBy('group_month', 'asc')

  return result.map((item) => ({
    value: item.groupAmount,
    date: item.groupMonth,
  }))
}

export default resolver
