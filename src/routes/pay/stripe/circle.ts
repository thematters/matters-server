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
import { Customer } from 'definitions'

export const completeCircleSubscription = async (
  setupIntent: Stripe.SetupIntent,
  dbCustomer: Customer
) => {
  const atomService = new AtomService()
  const paymentService = new PaymentService()

  const metadata = setupIntent.metadata
  const userId = dbCustomer.userId
  const circleId = _.get(metadata, METADATA_KEY.CIRCLE_ID)
  const priceId = _.get(metadata, METADATA_KEY.CIRCLE_PRICE_ID)

  // checck circle & price
  if (!circleId || !priceId) {
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

    // remove stripe subscription item if insertion failed
    await paymentService.stripe.deleteSubscriptionItem({
      id: stripeItem.id,
    })

    throw new ServerError('could not create circle subscription item')
  }

  // invalidate circle
  const cacheService = new CacheService()
  invalidateFQC({
    node: { type: NODE_TYPES.circle, id: circle.id },
    redis: cacheService.redis,
  })
}
