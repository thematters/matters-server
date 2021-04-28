require('dotenv').config()

const Stripe = require('stripe')

const t_subscription = 'circle_subscription'

const t_subscription_item = 'circle_subscription_item'

exports.up = async (knex) => {
  const secret = process.env['MATTERS_STRIPE_SECRET']

  if (!secret) {
    console.error('Stripe secret is not provided')
    return
  }

  const stripeAPI = new Stripe(secret, { apiVersion: '2020-03-02' })

  // fetch migrated subscription items
  const items = await knex
    .select('circle_subscription_item.*', 'circle_subscription.provider_subscription_id')
    .from(t_subscription_item)
    .join(t_subscription, 'circle_subscription_item.subscription_id', 'circle_subscription.id')
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
      console.log(item)

      const stripeItems = await stripeAPI.subscriptionItems.list({
        subscription: item.provider_subscription_id
      })

      if (!stripeItems || !stripeItems.data && stripeItems.data <= 0) {
        console.log('Subscription items not found')
        continue
      }

      const data = stripeItems.data || []
      const count = data.length

      if (count === 1 && data[0].id === item.provider_subscription_item_id) {
        const sub = await stripeAPI.subscriptions.retrieve(
          item.provider_subscription_id,
        )

        if (!sub) {
          console.log('Stripe subscription not found')
          continue
        }

        if (sub.canceled_at > 0) {
          console.log('Stripe subscription arleady canceled')
          continue
        }

        await stripeAPI.subscriptions.del(
          item.provider_subscription_id,
          { prorate: false }
        )
      } else if (count > 1) {
        const sub = await stripeAPI.subscriptions.retrieve(
          item.provider_subscription_id,
        )

        if (!sub) {
          console.log('Stripe subscription not found')
          continue
        }

        await stripeAPI.subscriptionItems.del(
          item.provider_subscription_item_id,
          { proration_behavior: 'none' }
        )
        await stripeAPI.subscriptions.update(
          item.provider_subscription_id,
          { coupon: '' }
        )
      }
    } catch (error) {
      console.error(error)
      console.error(`Failed to process item: ${item.id}`)
    }
  }
}

exports.down = async (knex) => {}
