import { compare } from 'bcrypt'

import {
  CACHE_KEYWORD,
  CIRCLE_ACTION,
  NODE_TYPES,
  PRICE_STATE,
  SUBSCRIPTION_STATE,
} from 'common/enums'
import { environment } from 'common/environment'
import {
  AuthenticationError,
  DuplicateCircleError,
  EntityNotFoundError,
  PasswordInvalidError,
  PaymentPasswordNotSetError,
  ServerError,
  UserInputError,
} from 'common/errors'
import logger from 'common/logger'
import { fromGlobalId } from 'common/utils'
import { MutationToSubscribeCircleResolver } from 'definitions'

const resolver: MutationToSubscribeCircleResolver = async (
  root,
  { input: { id, password } },
  { viewer, dataSources: { atomService, paymentService }, knex }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }
  if (!environment.stripePriceId) {
    throw new ServerError('matters price id not found')
  }
  if (!viewer.paymentPasswordHash) {
    throw new PaymentPasswordNotSetError('viewer payment password has not set')
  }
  const verified = await compare(password, viewer.paymentPasswordHash)
  if (!verified) {
    throw new PasswordInvalidError('password is incorrect, pay failed.')
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
    throw new EntityNotFoundError(`circle ${circleId} not found`)
  }
  if (!price) {
    throw new EntityNotFoundError(`price of circle ${circleId} not found`)
  }

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
      customer: environment.stripeCustomerId, // temp customer id
      price: environment.stripePriceId,
    })
    if (!stripeSubscription) {
      throw new ServerError('cannot retrieve stripe subscription')
    }

    subscription = await atomService.create({
      table: 'circle_subscription',
      data: {
        providerSubscriptionId: stripeSubscription.id,
        userId: viewer.id,
      },
    })
  }

  // create stripe subscription item
  const stripeItem = await paymentService.stripe.createSubscriptionItem({
    price: price.providerPriceId,
    subscription: subscription.providerSubscriptionId,
  })

  if (!stripeItem) {
    throw new ServerError('cannot retrieve stripe subscription item')
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
    // remove stripe subscription item if insertion failed
    await paymentService.stripe.deleteSubscriptionItem({
      id: stripeItem.id,
    })
    logger.error(error)
    throw new ServerError('could not create circle subscription item')
  }

  return { client_secret: '' } // correct after using real customer id
}

export default resolver
