import {
  CACHE_KEYWORD,
  NODE_TYPES,
  PRICE_STATE,
  SUBSCRIPTION_STATE,
} from 'common/enums'
import {
  AuthenticationError,
  CircleNotFoundError,
  EntityNotFoundError,
  ForbiddenError,
  UserInputError,
} from 'common/errors'
import { fromGlobalId, isFeatureEnabled } from 'common/utils'
import { MutationToUnsubscribeCircleResolver } from 'definitions'

const resolver: MutationToUnsubscribeCircleResolver = async (
  root,
  { input: { id } },
  { viewer, dataSources: { atomService, paymentService }, knex }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  // check feature is enabled or not
  const feature = await atomService.findFirst({
    table: 'feature_flag',
    where: { name: 'circle_interact' },
  })
  if (feature && !isFeatureEnabled(feature.flag, viewer)) {
    throw new ForbiddenError('viewer has no permission')
  }

  const { id: circleId } = fromGlobalId(id || '')
  const [circle, price] = await Promise.all([
    atomService.findUnique({
      table: 'circle',
      where: { id: circleId },
    }),
    atomService.findFirst({
      table: 'circle_price',
      where: { circleId, state: PRICE_STATE.active },
    }),
  ])

  if (!circle) {
    throw new CircleNotFoundError(`circle ${id} not found`)
  }
  if (!price) {
    throw new EntityNotFoundError(`price of circle ${id} not found`)
  }

  const subscription = await atomService.findFirst({
    table: 'circle_subscription',
    where: {
      state: SUBSCRIPTION_STATE.active,
      userId: viewer.id,
    },
  })

  const item = subscription
    ? await atomService.findFirst({
        table: 'circle_subscription_item',
        where: {
          subscriptionId: subscription.id,
          priceId: price.id,
        },
      })
    : null

  if (!item) {
    throw new UserInputError('circle unsubscribed already')
  }

  // remove stripe subscription item
  await paymentService.stripe.deleteSubscriptionItem({
    id: item.providerSubscriptionItemId,
  })

  // remove subscription item
  await atomService.deleteMany({
    table: 'circle_subscription_item',
    where: { id: item.id },
  })

  // invalidate cache
  circle[CACHE_KEYWORD] = [
    {
      id: viewer.id,
      type: NODE_TYPES.user,
    },
  ]

  return circle
}

export default resolver
