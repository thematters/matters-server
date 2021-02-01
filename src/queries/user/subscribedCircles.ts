import { PRICE_STATE, SUBSCRIPTION_STATE } from 'common/enums'
import { connectionFromArray, cursorToIndex } from 'common/utils'
import { UserToSubscribedCirclesResolver } from 'definitions'

const resolver: UserToSubscribedCirclesResolver = async (
  { id },
  { input },
  { dataSources: { atomService }, knex }
) => {
  if (!id) {
    return connectionFromArray([], input)
  }

  const { first: take, after } = input
  const skip = cursorToIndex(after) + 1

  const where = {
    'cs.state': SUBSCRIPTION_STATE.active,
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
    .first()
  const totalCount = parseInt(record ? (record.count as string) : '0', 10)

  const query = knex
    .from('circle_subscription_item as csi')
    .join('circle_price', 'circle_price.id', 'csi.price_id')
    .join('circle_subscription as cs', 'cs.id', 'csi.subscription_id')
    .where(where)

  if (skip) {
    query.offset(skip)
  }

  if (take) {
    query.limit(take)
  }

  const circleIds = await query.select('circle_price.circle_id')
  const circles = await atomService.circleIdLoader.loadMany(
    circleIds.map(({ circleId }) => circleId)
  )

  return connectionFromArray(circles, input, totalCount)
}

export default resolver
