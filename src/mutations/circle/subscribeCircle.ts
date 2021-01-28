import { invalidateFQC } from '@matters/apollo-response-cache'
import { ForbiddenError } from 'apollo-server-express'
import { compare } from 'bcrypt'

import {
  METADATA_KEY,
  NODE_TYPES,
  PAYMENT_PROVIDER,
  PRICE_STATE,
  SUBSCRIPTION_STATE,
} from 'common/enums'
import { environment } from 'common/environment'
import {
  AuthenticationError,
  CircleNotFoundError,
  DuplicateCircleError,
  EntityNotFoundError,
  PasswordInvalidError,
  PaymentPasswordNotSetError,
  ServerError,
} from 'common/errors'
import logger from 'common/logger'
import { fromGlobalId } from 'common/utils'
import { CacheService } from 'connectors'
import { Customer, MutationToSubscribeCircleResolver } from 'definitions'

const resolver: MutationToSubscribeCircleResolver = async (
  root,
  { input: { id, password } },
  { viewer, dataSources: { atomService, paymentService }, knex }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  // if (!environment.stripePriceId) {
  //   throw new ServerError('matters price id not found')
  // }

  // check password
  if (password) {
    if (!viewer.paymentPasswordHash) {
      throw new PaymentPasswordNotSetError(
        'viewer payment password has not set'
      )
    }

    const verified = await compare(password, viewer.paymentPasswordHash)

    if (!verified) {
      throw new PasswordInvalidError('password is incorrect.')
    }
  }

  // check circle
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

  const provider = PAYMENT_PROVIDER.stripe

  /**
   * Retrieve or create a Customer
   */
  let customer = (await atomService.findFirst({
    table: 'customer',
    where: {
      userId: viewer.id,
      provider,
      archived: false,
    },
  })) as Customer

  if (!customer) {
    customer = (await paymentService.createCustomer({
      user: viewer,
      provider,
    })) as Customer
  }

  /**
   * Retrieve or create a Subscription
   */
  let subscription = await atomService.findFirst({
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

  if (item) {
    throw new DuplicateCircleError('circle subscribed alraedy')
  }

  // init subscription with matters price placeholder if it doesn't exist
  if (!subscription) {
    const stripeSubscription = await paymentService.stripe.createSubscription({
      customer: customer.customerId,
      price: environment.stripePriceId,
    })

    if (!stripeSubscription) {
      throw new ServerError('cannot create stripe subscription')
    }

    subscription = await atomService.create({
      table: 'circle_subscription',
      data: {
        providerSubscriptionId: stripeSubscription.id,
        userId: viewer.id,
      },
    })
  }

  /**
   * (Sync) Subscribe via payment password
   *
   * @returns {{ circle: Circle }}
   */
  if (password) {
    if (!customer.cardLast4) {
      throw new ForbiddenError(
        'subscribe via password requires a pre-filled credit card.'
      )
    }

    // create stripe subscription item
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
          userId: viewer.id,
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

    // invalidate user & circle
    const cacheService = new CacheService()
    invalidateFQC({
      node: { type: NODE_TYPES.circle, id: circle.id },
      redis: cacheService.redis,
    })
    invalidateFQC({
      node: { type: NODE_TYPES.user, id: viewer.id },
      redis: cacheService.redis,
    })

    return { circle }
  }

  /**
   * (Async) Subscirbe via credit card
   *
   * @see /src/routes/pay/stripe.ts
   * @returns {{ circle: Circle, client_secret: string }}
   */
  const setupIntent = await paymentService.stripe.createSetupIntent({
    customerId: customer.customerId,
    metadata: {
      [METADATA_KEY.CIRCLE_ID]: circle.id,
      [METADATA_KEY.CIRCLE_PRICE_ID]: price.id,
      [METADATA_KEY.USER_ID]: viewer.id,
      [METADATA_KEY.CUSTOMER_ID]: customer.id,
    },
  })

  if (!setupIntent) {
    throw new ServerError('failed to create setup')
  }

  return { circle, client_secret: setupIntent.client_secret }
}

export default resolver
