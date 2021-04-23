import {
  CACHE_KEYWORD,
  CIRCLE_STATE,
  DB_NOTICE_TYPE,
  NODE_TYPES,
  PRICE_STATE,
} from 'common/enums'
import {
  AuthenticationError,
  CircleNotFoundError,
  EntityNotFoundError,
  ForbiddenError,
} from 'common/errors'
import { fromGlobalId } from 'common/utils'
import { MutationToUnsubscribeCircleResolver } from 'definitions'

const resolver: MutationToUnsubscribeCircleResolver = async (
  root,
  { input: { id } },
  {
    viewer,
    dataSources: {
      atomService,
      paymentService,
      systemService,
      notificationService,
    },
    knex,
  }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  // check feature is enabled or not
  const feature = await systemService.getFeatureFlag('circle_interact')
  if (
    feature &&
    !(await systemService.isFeatureEnabled(feature.flag, viewer))
  ) {
    throw new ForbiddenError('viewer has no permission')
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

  const subscriptions = await paymentService.findSubscriptions({
    userId: viewer.id,
  })

  await Promise.all(
    subscriptions.map(async (subscription) => {
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
      }

      // archive subscription item
      await atomService.update({
        table: 'circle_subscription_item',
        where: { id: targetItem.id },
        data: {
          archived: true,
          updatedAt: new Date(),
        },
      })
    })
  )

  // trigger notificaiton
  notificationService.trigger({
    event: DB_NOTICE_TYPE.circle_new_unsubscriber,
    actorId: viewer.id,
    recipientId: circle.owner,
    entities: [
      {
        type: 'target',
        entityTable: 'circle',
        entity: circle,
      },
    ],
  })

  // invalidate cache
  circle[CACHE_KEYWORD] = [
    {
      id: viewer.id,
      type: NODE_TYPES.User,
    },
  ]

  return circle
}

export default resolver
