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
  DuplicateCircleSubscribeError,
  EntityNotFoundError,
  ServerError,
  UserInputError,
} from 'common/errors'
import { fromGlobalId } from 'common/utils'
import { MutationToToggleCircleSubscriptionResolver } from 'definitions'

// local enums
enum ACTION {
  subscribe = 'subscribe',
  unsubscribe = 'unscribe',
}

const resolver: MutationToToggleCircleSubscriptionResolver = async (
  root,
  { input: { id, enabled } },
  { viewer, dataSources: { atomService, paymentService }, knex }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }
  if (typeof enabled !== 'boolean') {
    throw new UserInputError('parameter "enabled" is required')
  }

  const action = enabled ? ACTION.subscribe : ACTION.unsubscribe
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

  const item = await atomService.findFirst({
    table: 'circle_subscription_item',
    where: {
      subscriptionId: subscription.id,
      priceId: price.id,
    },
  })

  switch (action) {
    case ACTION.subscribe: {
      if (item) {
        throw new DuplicateCircleSubscribeError('circle subscribed alraedy')
      }

      // reinit subscription if it doesn't exist
      if (!subscription) {
        const stripeSubscription = await paymentService.stripe.createSubscription(
          {
            customer: environment.stripeCustomerId,
            price: price.id,
          }
        )
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

      // craete stripe subscroption item
      const stripeItem = await paymentService.stripe.createSubscriptionItem({
        price: price.id,
        subscription: subscription.id,
      })

      if (!stripeItem) {
        throw new ServerError('cannot retrieve stripe subscription item')
      }

      await knex.transaction(async (trx) => {
        await trx
          .insert({
            priceId: price.id,
            providerSubscriptionItemId: stripeItem.id,
            subscriptionId: subscription.id,
            userId: viewer.id,
          })
          .into('circle_subscription_item')
        await trx
          .insert({
            action: CIRCLE_ACTION.join,
            targetId: circleId,
            userId: viewer.id,
          })
          .into('action_circle')
      })
      break
    }
    case ACTION.unsubscribe: {
      if (!item) {
        throw new UserInputError('circle unsubscribed already')
      }

      // remove stripe subscription item
      await paymentService.stripe.deleteSubscriptionItem(
        item.providerSubscriptionItemId
      )

      // remove subscription item and join action
      await knex.transaction(async (trx) => {
        await trx('circle_subscription_item').where({ id: item.id }).del()
        await trx('action_circle')
          .where({
            action: CIRCLE_ACTION.join,
            userId: viewer.id,
            targetId: circleId,
          })
          .del()
      })
      break
    }
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
