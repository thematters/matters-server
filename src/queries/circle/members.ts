import { PRICE_STATE, SUBSCRIPTION_STATE } from 'common/enums'
import { connectionFromArray, fromConnectionArgs } from 'common/utils'
import { CircleToMembersResolver } from 'definitions'

const resolver: CircleToMembersResolver = async (
  { id },
  { input },
  { dataSources: { atomService }, knex }
) => {
  if (!id) {
    return connectionFromArray([], input)
  }

  const { take, skip } = fromConnectionArgs(input)

  const where = {
    'circle_price.circle_id': id,
    'circle_price.state': PRICE_STATE.active,
    'csi.archived': false,
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
    ])
    .first()
  const totalCount = parseInt(record ? (record.count as string) : '0', 10)

  const query = knex
    .select('csi.user_id')
    .from('circle_subscription_item as csi')
    .join('circle_price', 'circle_price.id', 'csi.price_id')
    .join('circle_subscription as cs', 'cs.id', 'csi.subscription_id')
    .where(where)
    .whereIn('cs.state', [
      SUBSCRIPTION_STATE.active,
      SUBSCRIPTION_STATE.trialing,
    ])

  if (skip) {
    query.offset(skip)
  }
  if (take) {
    query.limit(take)
  }
  const memberIds = await query

  const members = (
    await atomService.userIdLoader.loadMany(
      memberIds.map(({ userId }) => userId)
    )
  ).map((user) => ({ ...user, circleId: id }))

  return connectionFromArray(members, input, totalCount)
}

export default resolver
