import { invalidateFQC } from '@matters/apollo-response-cache'
import { compare } from 'bcrypt'

import {
  CIRCLE_STATE,
  METADATA_KEY,
  NODE_TYPES,
  PAYMENT_PROVIDER,
  PRICE_STATE,
  SUBSCRIPTION_STATE,
} from 'common/enums'
import {
  AuthenticationError,
  CircleNotFoundError,
  DuplicateCircleError,
  EntityNotFoundError,
  ForbiddenError,
  PasswordInvalidError,
  PaymentPasswordNotSetError,
  ServerError,
} from 'common/errors'
import { fromGlobalId } from 'common/utils'
import { CacheService } from 'connectors'
import { Customer, MutationToSubscribeCircleResolver } from 'definitions'

const resolver: MutationToSubscribeCircleResolver = async (
  root,
  { input: { id, password } },
  { viewer, dataSources: { atomService, paymentService, systemService }, knex }
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

  const provider = PAYMENT_PROVIDER.stripe

  // retrieve or create a Customer
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

  // check subscription
  const subscription = await atomService.findFirst({
    table: 'circle_subscription',
    where: {
      userId: viewer.id,
      state: SUBSCRIPTION_STATE.active,
    },
  })
  const item = subscription
    ? await atomService.findFirst({
        table: 'circle_subscription_item',
        where: {
          subscriptionId: subscription.id,
          priceId: price.id,
          archived: false,
        },
      })
    : null

  if (item) {
    throw new DuplicateCircleError('circle subscribed alraedy')
  }

  // FIXME: check subscribed circles
  // @see {@url https://stripe.com/docs/billing/subscriptions/multiple-products#restrictions}
  const record = await knex
    .count()
    .from('circle_subscription_item as csi')
    .join('circle_price', 'circle_price.id', 'csi.price_id')
    .join('circle_subscription as cs', 'cs.id', 'csi.subscription_id')
    .where({
      'csi.user_id': viewer.id,
      'csi.archived': false,
      'circle_price.state': PRICE_STATE.active,
    })
    .whereIn('cs.state', [
      SUBSCRIPTION_STATE.active,
      SUBSCRIPTION_STATE.trialing,
    ])
    .first()
  const subscribedCount = parseInt(record ? (record.count as string) : '0', 10)
  if (subscribedCount > 20) {
    throw new ForbiddenError('limited to subscribe up to 20 circles.')
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

    if (!subscription) {
      await paymentService.createSubscription({
        userId: viewer.id,
        priceId: price.id,
        providerCustomerId: customer.customerId,
        providerPriceId: price.providerPriceId,
      })
    } else {
      await paymentService.createSubscriptionItem({
        userId: viewer.id,
        priceId: price.id,
        subscriptionId: subscription.id,
        providerPriceId: price.providerPriceId,
        providerSubscriptionId: subscription.providerSubscriptionId,
      })
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
