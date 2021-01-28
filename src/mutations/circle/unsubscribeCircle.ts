import {
  CACHE_KEYWORD,
  CIRCLE_STATE,
  NODE_TYPES,
  PRICE_STATE,
  SUBSCRIPTION_STATE,
} from 'common/enums'
import {
  AuthenticationError,
  CircleNotFoundError,
  EntityNotFoundError,
  UserInputError,
} from 'common/errors'
import { fromGlobalId } from 'common/utils'
import { MutationToUnsubscribeCircleResolver } from 'definitions'

const resolver: MutationToUnsubscribeCircleResolver = async (
  root,
  { input: { id } },
  { viewer, dataSources: { atomService, paymentService }, knex }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  const { id: circleId } = fromGlobalId(id || '')
  const [circle, price] = await Promise.all([
    atomService.findFirst({
      table: 'circle',
      where: { id: circleId, state: CIRCLE_STATE.active },
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
      userId: viewer.id,
      state: SUBSCRIPTION_STATE.active,
    },
  })
  const items = subscription
    ? await atomService.findMany({
        table: 'circle_subscription_item',
        where: {
          subscriptionId: subscription.id,
          archived: false,
        },
      })
    : []
  const targetItem = items.find((item) => item.priceId === price.id)

  if (!targetItem) {
    return circle
  }

  if (items.length <= 1) {
    // cancel stripe subscription
    const stripeSubscription = await paymentService.stripe.cancelSubscription(
      subscription.providerSubscriptionId
    )

    // update db subscription
    if (stripeSubscription) {
      await atomService.update({
        table: 'circle_subscription',
        where: { id: subscription.id },
        data: {
          state: stripeSubscription.status,
          canceledAt: stripeSubscription.canceled_at
            ? new Date(stripeSubscription.canceled_at * 1000)
            : undefined,
          updatedAt: new Date(),
        },
      })
    }
  } else {
    // remove stripe subscription item
    await paymentService.stripe.deleteSubscriptionItem(
      targetItem.providerSubscriptionItemId
    )

    // archive subscription item
    await atomService.update({
      table: 'circle_subscription_item',
      where: { id: targetItem.id },
      data: {
        archived: true,
        updatedAt: new Date(),
      },
    })
  }

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
