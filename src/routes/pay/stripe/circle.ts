import { invalidateFQC } from '@matters/apollo-response-cache'
import _ from 'lodash'
import Stripe from 'stripe'

import {
  METADATA_KEY,
  NODE_TYPES,
  PRICE_STATE,
  SUBSCRIPTION_STATE,
} from 'common/enums'
import { ServerError } from 'common/errors'
import logger from 'common/logger'
import { AtomService, CacheService, PaymentService } from 'connectors'
import SlackService from 'connectors/slack'
import { Customer } from 'definitions'

/**
 * Complete the circle subscription that
 * occurs by `/src/mutations/circle/subscribeCircle.ts`
 * on setupIntent is succeeded
 *
 * @param setupIntent
 * @param dbCustomer
 */
export const completeCircleSubscription = async ({
  setupIntent,
  dbCustomer,
  event,
}: {
  setupIntent: Stripe.SetupIntent
  dbCustomer: Customer
  event: Stripe.Event
}) => {
  const atomService = new AtomService()
  const paymentService = new PaymentService()
  const slack = new SlackService()
  const slackEventData = {
    id: event.id,
    type: event.type,
  }

  const metadata = setupIntent.metadata
  const userId = dbCustomer.userId
  const circleId = _.get(metadata, METADATA_KEY.CIRCLE_ID)
  const priceId = _.get(metadata, METADATA_KEY.CIRCLE_PRICE_ID)

  // checck circle & price
  if (!circleId || !priceId) {
    slack.sendStripeAlert({
      data: slackEventData,
      message: `circle (${circleId}) or price (${priceId}) doesn't exist.`,
    })
    return
  }

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

  if (!circle || !price) {
    slack.sendStripeAlert({
      data: slackEventData,
      message: `can't find circle (${circleId}) or price (${priceId}).`,
    })
    return
  }

  // check subscription
  const subscription = await atomService.findFirst({
    table: 'circle_subscription',
    where: {
      state: SUBSCRIPTION_STATE.active,
      userId,
    },
  })

  if (!subscription) {
    slack.sendStripeAlert({
      data: slackEventData,
      message: `user (${userId}) hasn't subscription.`,
    })
    return
  }

  // subscribe circle
  const stripeItem = await paymentService.stripe.createSubscriptionItem({
    price: price.providerPriceId,
    subscription: subscription.providerSubscriptionId,
  })

  if (!stripeItem) {
    throw new ServerError('cannot create stripe subscription item')
  }

  try {
    await atomService.create({
      table: 'circle_subscription_item',
      data: {
        priceId: price.id,
        providerSubscriptionItemId: stripeItem.id,
        subscriptionId: subscription.id,
        userId,
      },
    })
  } catch (error) {
    logger.error(error)

    slack.sendStripeAlert({
      data: slackEventData,
      message: `cannot create circle subscription item.`,
    })

    // remove stripe subscription item if insertion failed
    await paymentService.stripe.deleteSubscriptionItem({
      id: stripeItem.id,
    })

    throw new ServerError('could not create circle subscription item')
  }

  // invalidate user & circle
  const cacheService = new CacheService()
  invalidateFQC({
    node: { type: NODE_TYPES.circle, id: circle.id },
    redis: cacheService.redis,
  })
  invalidateFQC({
    node: { type: NODE_TYPES.user, id: userId },
    redis: cacheService.redis,
  })
}

/**
 * Sync db subscription with Stripe
 *
 * @param subscription
 */
export const updateSubscription = async ({
  subscription,
  event,
}: {
  subscription: Stripe.Subscription
  event: Stripe.Event
}) => {
  const atomService = new AtomService()
  const paymentService = new PaymentService()
  const cacheService = new CacheService()
  const slack = new SlackService()
  const slackEventData = {
    id: event.id,
    type: event.type,
  }

  const dbSubscription = await atomService.findFirst({
    table: 'circle_subscription',
    where: { providerSubscriptionId: subscription.id },
  })

  if (!dbSubscription) {
    slack.sendStripeAlert({
      data: slackEventData,
      message: `can't find subscription ${subscription.id}.`,
    })
    return
  }

  const userId = dbSubscription.userId
  const subscriptionId = dbSubscription.id

  /**
   * subscription
   */
  try {
    if (dbSubscription.state !== subscription.status) {
      await atomService.update({
        table: 'circle_subscription',
        where: { id: dbSubscription.id },
        data: {
          state: subscription.status,
          canceledAt: subscription.canceled_at
            ? new Date(subscription.canceled_at * 1000)
            : undefined,
          updatedAt: new Date(),
        },
      })
    }
  } catch (error) {
    logger.error(error)
    throw new ServerError('failed to update subscription')
  }

  /**
   * subscription items
   */
  let addedPriceIds = []
  let removedPriceIds = []
  try {
    // retrieve all subscription items
    const [stripeSubscriptionItems, dbSubscriptionItems] = await Promise.all([
      await paymentService.stripe.stripeAPI.subscriptionItems.list({
        subscription: subscription.id,
        limit: 100,
      }),
      atomService.findMany({
        table: 'circle_subscription_item',
        where: {
          userId,
          subscriptionId,
        },
      }),
    ])

    const dbPriceIds = (
      await atomService.findMany({
        table: 'circle_price',
        whereIn: [
          'provider_price_id',
          stripeSubscriptionItems.data.map((item) => item.price.id),
        ],
      })
    ).map((item) => item.id)
    const dbCurrPriceIds = dbSubscriptionItems.map((item) => item.priceId)

    // added
    addedPriceIds = _.difference(dbPriceIds, dbCurrPriceIds)
    await Promise.all(
      addedPriceIds.map(async (priceId) => {
        const providerSubscriptionItemId = stripeSubscriptionItems.data.find(
          (item) => item.price.id === priceId
        )
        await atomService.create({
          table: 'circle_subscription_item',
          data: {
            priceId,
            providerSubscriptionItemId,
            subscriptionId,
            userId,
          },
        })
      })
    )

    // removed
    removedPriceIds = _.difference(dbCurrPriceIds, dbPriceIds)
    await atomService.deleteMany({
      table: 'circle_subscription_item',
      where: {
        userId,
        subscriptionId,
      },
      whereIn: ['price_id', removedPriceIds],
    })
  } catch (error) {
    logger.error(error)
    throw new ServerError('failed to update subscription items')
  }

  // invalidate user & circle
  try {
    const dbDiffPrices = await atomService.findMany({
      table: 'circle_price',
      whereIn: ['id', [...addedPriceIds, ...removedPriceIds]],
    })
    invalidateFQC({
      node: { type: NODE_TYPES.user, id: dbSubscription.userId },
      redis: cacheService.redis,
    })
    dbDiffPrices.map((price) => {
      invalidateFQC({
        node: { type: NODE_TYPES.circle, id: price.circleId },
        redis: cacheService.redis,
      })
    })
  } catch (error) {
    logger.error(error)
  }

  return
}
