import { invalidateFQC } from '@matters/apollo-response-cache'
import { compare } from 'bcrypt'

import {
  CIRCLE_ACTION,
  CIRCLE_STATE,
  DB_NOTICE_TYPE,
  METADATA_KEY,
  NODE_TYPES,
  PAYMENT_PROVIDER,
  PRICE_STATE,
  SUBSCRIPTION_STATE,
} from 'common/enums/index.js'
import {
  AuthenticationError,
  CircleNotFoundError,
  DuplicateCircleSubscriptionError,
  EntityNotFoundError,
  ForbiddenError,
  PasswordInvalidError,
  PaymentPasswordNotSetError,
  ServerError,
} from 'common/errors.js'
import { fromGlobalId } from 'common/utils/index.js'
import { CacheService } from 'connectors/index.js'
import { Customer, MutationToSubscribeCircleResolver } from 'definitions'

const resolver: MutationToSubscribeCircleResolver = async (
  root,
  { input: { id, password } },
  {
    viewer,
    dataSources: {
      atomService,
      notificationService,
      paymentService,
      systemService,
      userService,
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

  // check viewer is blocked by circle owner
  const isBlocked = await userService.blocked({
    userId: circle.owner,
    targetId: viewer.id,
  })
  if (isBlocked) {
    throw new ForbiddenError('viewer has no permission')
  }

  // retrieve or create a Customer
  let customer = (await atomService.findFirst({
    table: 'customer',
    where: {
      userId: viewer.id,
      provider: PAYMENT_PROVIDER.stripe,
      archived: false,
    },
  })) as Customer
  if (!customer) {
    customer = (await paymentService.createCustomer({
      user: viewer,
      provider: PAYMENT_PROVIDER.stripe,
    })) as Customer
  }

  // check subscription
  const subscriptions = await paymentService.findActiveSubscriptions({
    userId: viewer.id,
  })
  const items =
    subscriptions && subscriptions.length > 0
      ? await atomService.findMany({
          table: 'circle_subscription_item',
          where: { priceId: price.id, archived: false },
          whereIn: ['subscription_id', subscriptions.map((sub) => sub.id)],
        })
      : null

  if (items && items.length > 0) {
    throw new DuplicateCircleSubscriptionError('circle subscribed alraedy')
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

    await paymentService.createSubscriptionOrItem({
      userId: viewer.id,
      priceId: price.id,
      providerPriceId: price.providerPriceId,
      providerCustomerId: customer.customerId,
      subscriptions,
    })

    // trigger notificaiton
    notificationService.trigger({
      event: DB_NOTICE_TYPE.circle_new_subscriber,
      actorId: viewer.id,
      recipientId: circle.owner,
      entities: [{ type: 'target', entityTable: 'circle', entity: circle }],
    })

    // auto follow circle without notification
    const hasFollow = await atomService.count({
      table: 'action_circle',
      where: {
        action: CIRCLE_ACTION.follow,
        userId: viewer.id,
        targetId: circleId,
      },
    })
    if (hasFollow === 0) {
      await atomService.create({
        table: 'action_circle',
        data: {
          action: CIRCLE_ACTION.follow,
          userId: viewer.id,
          targetId: circleId,
        },
      })
    }

    // invalidate user & circle
    const cacheService = new CacheService()
    invalidateFQC({
      node: { type: NODE_TYPES.Circle, id: circle.id },
      redis: cacheService.redis,
    })
    invalidateFQC({
      node: { type: NODE_TYPES.User, id: viewer.id },
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
