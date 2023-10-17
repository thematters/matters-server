import type { GQLCircleIncomeAnalyticsResolvers } from 'definitions'

import {
  PAYMENT_PROVIDER,
  PRICE_STATE,
  TRANSACTION_PURPOSE,
  TRANSACTION_STATE,
  TRANSACTION_TARGET_TYPE,
} from 'common/enums'

const resolver: GQLCircleIncomeAnalyticsResolvers['thisMonth'] = async (
  { id, owner },
  _,
  {
    dataSources: {
      atomService,
      systemService,
      connections: { knex },
    },
  }
) => {
  const [{ id: entityTypeId }, price] = await Promise.all([
    systemService.baseFindEntityTypeId(TRANSACTION_TARGET_TYPE.circlePrice),
    atomService.findFirst({
      table: 'circle_price',
      where: { circleId: id, state: PRICE_STATE.active },
    }),
  ])

  const result = await knex
    .select()
    .from('transaction')
    .where({
      state: TRANSACTION_STATE.succeeded,
      purpose: TRANSACTION_PURPOSE.subscriptionSplit,
      provider: PAYMENT_PROVIDER.matters,
      recipientId: owner,
      targetType: entityTypeId,
      targetId: price.id,
    })
    .andWhere(
      'created_at',
      '<',
      knex.raw(`date_trunc('month', current_date + interval '1' month)`)
    )
    .andWhere('created_at', '>=', knex.raw(`date_trunc('month', current_date)`))
    .sum('amount', { as: 'total' })
    .first()

  return parseInt((result?.total as string) || '0', 10)
}

export default resolver
