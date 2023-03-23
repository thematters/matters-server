import {
  CACHE_KEYWORD,
  CIRCLE_STATE,
  DB_NOTICE_TYPE,
  NODE_TYPES,
  PAYMENT_PROVIDER,
  PRICE_STATE,
  SUBSCRIPTION_ITEM_REMARK,
  SUBSCRIPTION_STATE,
} from 'common/enums/index.js'
import {
  AuthenticationError,
  CircleNotFoundError,
  EntityNotFoundError,
  ForbiddenError,
} from 'common/errors.js'
import { fromGlobalId } from 'common/utils/index.js'
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

  // check circle
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

  // loop subscriptions
  const subscriptions = await paymentService.findActiveSubscriptions({
    userId: viewer.id,
  })

  const cancelSubscription = async (sub: any) => {
    let state
    let canceledAt

    // cancel stripe subscription
    if (sub.provider === PAYMENT_PROVIDER.stripe) {
      const stripeSub = await paymentService.stripe.cancelSubscription(
        sub.providerSubscriptionId
      )
      state = stripeSub?.status
      canceledAt = stripeSub?.canceled_at
        ? new Date(stripeSub.canceled_at * 1000)
        : undefined
    }

    // update db
    await atomService.update({
      table: 'circle_subscription',
      where: { id: sub.id },
      data: {
        state: state || SUBSCRIPTION_STATE.canceled,
        canceledAt: canceledAt || new Date(),
        updatedAt: new Date(),
      },
    })
  }

  await Promise.all(
    subscriptions.map(async (sub) => {
      const isStripeSub = sub.provider === PAYMENT_PROVIDER.stripe
      const isMattersSub = sub.provider === PAYMENT_PROVIDER.matters

      const subItems = sub
        ? await atomService.findMany({
            table: 'circle_subscription_item',
            where: { subscriptionId: sub.id, archived: false },
          })
        : []
      const targetSubItem = subItems.find((item) => item.priceId === price.id)

      if (!targetSubItem) {
        return
      }

      // cancel the subscription if only one subscription item left
      if (subItems.length <= 1) {
        await cancelSubscription(sub)
      }
      // remove subscription item from Stripe
      else {
        if (isStripeSub) {
          await paymentService.stripe.deleteSubscriptionItem(
            targetSubItem.providerSubscriptionItemId
          )
        }
      }

      // archive subscription item
      await atomService.update({
        table: 'circle_subscription_item',
        where: { id: targetSubItem.id },
        data: {
          archived: true,
          updatedAt: new Date(),
          canceledAt: new Date(),
          ...(isMattersSub
            ? { remark: SUBSCRIPTION_ITEM_REMARK.trial_cancel }
            : {}),
        },
      })

      return
    })
  )

  // trigger notificaiton
  notificationService.trigger({
    event: DB_NOTICE_TYPE.circle_new_unsubscriber,
    actorId: viewer.id,
    recipientId: circle.owner,
    entities: [{ type: 'target', entityTable: 'circle', entity: circle }],
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
