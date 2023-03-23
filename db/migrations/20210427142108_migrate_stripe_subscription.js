import dotenv from 'dotenv'
dotenv.config()

import Stripe from 'stripe'

const t_subscription = 'circle_subscription'

const t_subscription_item = 'circle_subscription_item'

export const up = async (knex) => {
  const secret = process.env['MATTERS_STRIPE_SECRET']

  if (!secret) {
    console.error('Stripe secret is not provided')
    return
  }

  const stripeAPI = new Stripe(secret, { apiVersion: '2020-03-02' })

  // fetch migrated subscription items
  const items = await knex
    .select(
      'circle_subscription_item.*',
      'circle_subscription.provider_subscription_id'
    )
    .from(t_subscription_item)
    .join(
      t_subscription,
      'circle_subscription_item.subscription_id',
      'circle_subscription.id'
    )
    .where({
      'circle_subscription_item.archived': true,
      'circle_subscription_item.provider': 'stripe',
      'circle_subscription_item.remark': 'trial_migration',
    })

  const total = (items || []).length

  // process subscription items
  for (const [index, item] of items.entries()) {
    try {
      console.log('-------------------------------')
      console.log(`Process ${index + 1}/${total} item: ${item.id}`)

      // fetch stripe subscription item
      const stripeItems = await stripeAPI.subscriptionItems.list({
        subscription: item.provider_subscription_id,
      })

      if (!stripeItems || !stripeItems.data || stripeItems.data.length <= 0) {
        console.log('Subscription items not found')
        continue
      }

      // fetch stripe subscription
      const stripeSubscription = await stripeAPI.subscriptions.retrieve(
        item.provider_subscription_id
      )

      if (!stripeSubscription) {
        console.log('Stripe subscription not found')
        continue
      }

      if (stripeSubscription.canceled_at > 0) {
        console.log('Stripe subscription arleady canceled')
        continue
      }

      const data = stripeItems.data || []
      const count = data.length

      if (count === 1) {
        if (data[0].id === item.provider_subscription_item_id) {
          // cancel stripe subscription if the only one item applied coupon
          await stripeAPI.subscriptions.del(item.provider_subscription_id, {
            prorate: false,
          })
          console.log('Stripe subscription canceled')
        } else {
          console.log('Stripe subscription has other items, will not cancel')
        }
      } else if (count > 1) {
        // remove stripe item and coupon from stripe subscription
        let stripeSubscriptionItem
        try {
          stripeSubscriptionItem = await stripeAPI.subscriptionItems.retrieve(
            item.provider_subscription_item_id
          )
        } catch (error) {
          if (error.statusCode !== 404) {
            throw error
          }
        }

        if (!stripeSubscriptionItem) {
          console.log('Stripe subscription item not found')
          continue
        }

        await stripeAPI.subscriptionItems.del(
          item.provider_subscription_item_id,
          { proration_behavior: 'none' }
        )
        await stripeAPI.subscriptions.update(item.provider_subscription_id, {
          coupon: '',
        })
        console.log('Stripe subscription item deleted and subscription updated')
      }
    } catch (error) {
      console.error(error)
      console.error(`Failed to process item: ${item.id}`)
    }
  }
}

export const down = async (knex) => {}
