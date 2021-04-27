require('dotenv').config()

const Stripe = require('stripe')

const { v4 } = require('uuid')

const t_coupon = 'circle_coupon'

const t_invitation = 'circle_invitation'

const t_price = 'circle_price'

const t_subscription = 'circle_subscription'

const t_subscription_item = 'circle_subscription_item'

const t_user = 'user'

exports.up = async (knex) => {
  const secret = process.env['MATTERS_STRIPE_SECRET']

  if (!secret) {
    console.error('Stripe secret is not provided')
    return
  }

  const stripeAPI = new Stripe(secret, { apiVersion: '2020-03-02' })

  const findFirst = async ({ table, where }) => {
    return knex.select().from(table).where(where).first()
  }
  const insert = async ({ table, data }) => {
    const [record] = await knex(table).insert(data).returning('*')
    return record
  }
  const update = async ({ table, where, data }) => {
    const [record] = await knex(table).where(where).update(data).returning('*')
    return record
  }

  // fetch accepted invitations
  const invts = await knex
    .select()
    .from(t_invitation)
    .where({ accepted: true })
    .whereNull('subscription_item_id')
    .orderBy('accepted_at', 'asc')

  const total = (invts || []).length

  for (const [index, invt] of invts.entries()) {
    console.log('-------------------------------')
    console.log(`Process ${index + 1}/${total} invitation: ${invt.id}`)

    const { user_id: userId, email } = invt

    if (!userId && !email) {
      console.log('User id and email are not provided.')
      continue
    }

    const user = await findFirst({
      table: t_user,
      where: { ...(userId ? { id: userId } : { email }) },
    })

    if (!user) {
      console.log('User not found.')
      continue
    }
    console.log(`Invitation user: ${user.id}`)

    // Step 1: find matched subscription item
    const item = await knex
      .select('circle_subscription_item.*', 'circle_price.circle_id')
      .from(t_subscription_item)
      .join(t_price, 'circle_subscription_item.price_id', 'circle_price.id')
      .where({
        'circle_subscription_item.archived': false,
        'circle_subscription_item.provider': 'stripe',
        'circle_subscription_item.user_id': user.id,
        'circle_price.circle_id': invt.circle_id,
        'circle_price.state': 'active',
      })
      .first()

    if (!item) {
      console.log('Subscription item not found.')
      continue
    }
    console.log(`Subscription item: ${item.id}`)

    // Step 2: create Matters subscription if it doesn't exist
    const subscription = await knex
      .select()
      .from(t_subscription)
      .where({ provider: 'stripe', user_id: user.id })
      .whereIn('state', ['active', 'trialing'])
      .first()

    if (!subscription) {
      console.log('Subscription not found.')
      continue
    }
    console.log(`Subscription: ${subscription.id}`)

    let mattersSubscription = await findFirst({
      table: t_subscription,
      where: { provider: 'matters', user_id: user.id, state: 'trialing' },
    })

    if (!mattersSubscription) {
      mattersSubscription = await insert({
        table: t_subscription,
        data: {
          provider: 'matters',
          provider_subscription_id: v4(),
          state: 'trialing',
          user_id: user.id,
        },
      })
      console.log(`Inserted Matters subscription: ${mattersSubscription.id}`)
    }
    console.log(`Matters subscription: ${mattersSubscription.id}`)

    // Step 3: create Matters subscription item
    let mattersItem = await findFirst({
      table: t_subscription_item,
      where: {
        user_id: item.user_id,
        subscription_id: mattersSubscription.id,
        price_id: item.price_id,
        provider: 'matters',
        archived: false,
      }
    })

    if (!mattersItem) {
      mattersItem = await insert({
        table: t_subscription_item,
        data: {
          user_id: item.user_id,
          subscription_id: mattersSubscription.id,
          price_id: item.price_id,
          provider: 'matters',
          provider_subscription_item_id: v4(),
          archived: false,
        },
      })
      console.log(`Inserted Matters subscription item: ${mattersItem.id}`)
    }
    console.log(`Matters subscription item: ${mattersItem.id}`)

    // Step 4: update invitation with newly added subscription item
    await update({
      table: t_invitation,
      where: { id: invt.id },
      data: { subscription_item_id: mattersItem.id },
    })
    console.log(
      `Updated subscription item (${mattersItem.id}) to invitation (${invt.id}`
    )

    // Step 5: remove Stripe subscription item, including Stripe subscription if it has no or only one item
    let canceledStripeSubscription
    const stripeItems = await stripeAPI.subscriptionItems.list({
      subscription: subscription.provider_subscription_id,
    })

    if (stripeItems && stripeItems.data && stripeItems.data.length > 0) {
      if (
        stripeItems.data.length === 1 &&
        stripeItems.data[0].id === item.provider_subscription_item_id
      ) {
        console.log(
          `Cancel entire Stripe subscription: ${subscription.provider_subscription_id}`
        )
        canceledStripeSubscription = await stripeAPI.subscriptions.del(
          subscription.provider_subscription_id,
          { prorate: false }
        )
        console.log('Cancel completed')
      } else if (stripeItems.data.length > 1) {
        console.log(
          `Remove Stripe subscription item: ${item.provider_subscription_item_id}`
        )
        await stripeAPI.subscriptionItems.del(
          item.provider_subscription_item_id,
          { proration_behavior: 'none' }
        )
        console.log('Remove completed')
        console.log(
          `Update Stripe subscription with empty coupon: ${subscription.provider_subscription_id}`
        )
        await stripeAPI.subscriptions.update(
          subscription.provider_subscription_id,
          { coupon: '' }
        )
        console.log('Update completed')
      }
    } else {
      console.log('No Stripe subscription items need to update')
    }

    // Step 6: archive Matters-Stripe subscription item
    await update({
      table: t_subscription_item,
      where: { id: item.id },
      data: { archived: true, remark: 'trial_migration' },
    })
    console.log(`Upadted matters-stripe subscription item: ${item.id}`)

    // Step 7: update Matters-Stripe subscription
    if (canceledStripeSubscription) {
      const record = await knex
        .count()
        .from(t_subscription_item)
        .where({ archived: false, subscription_id: subscription.id })
        .first()

      const count = parseInt(record ? `${record.count}` : '0', 10)

      if (count > 0) {
        console.log(
          `Subscription has other items, won't cancel: ${subscription.id}`
        )
        continue
      }

      await update({
        table: t_subscription,
        where: { id: subscription.id },
        data: {
          state: canceledStripeSubscription.status,
          canceled_at: canceledStripeSubscription.canceled_at
            ? new Date(canceledStripeSubscription.canceled_at * 1000)
            : new Date(),
          updated_at: new Date(),
        },
      })
      console.log(
        `Updated subscription status and action times: ${subscription.id}`
      )
    }
  }
}

exports.down = async (knex) => {}
