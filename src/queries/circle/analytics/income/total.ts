import {
  PAYMENT_PROVIDER,
  PRICE_STATE,
  TRANSACTION_PURPOSE,
  TRANSACTION_STATE,
  TRANSACTION_TARGET_TYPE,
} from 'common/enums/index.js'
import { CircleIncomeAnalyticsToTotalResolver } from 'definitions'

const resolver: CircleIncomeAnalyticsToTotalResolver = async (
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
    .sum('amount', { as: 'total' })
    .first()

  return parseInt((result?.total as string) || '0', 10)
}

export default resolver
