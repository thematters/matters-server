const stripe = require('stripe')

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
    return kenx.select().from(table).where(where).first()
  }
  const insert = async ({ table, data }) => {
    return knex(table).insert(data).returning('*')
  }
  const update = async ({ table, where, data }) => {
    return knex(table).where(where).update(data).returning('*')
  }

  // fetch accepted invitations
  const invts = await knex
    .select()
    .from(t_invitation)
    .where({ accepted: true })
    .orderBy('accepted_at', 'asc')

  for (const invt of invts) {
    const { user_id: userId, email } = invt

    if (!userId && !email) {
      continue
    }

    const user = await findFirst({
      table: t_user,
      where: { ...(userId ? { id: userId } : { email }) },
    })

    if (!user) {
      continue
    }

    // Step 1: find matched subscription item
    const item = await knex
      .select('circle_subscription_item.*', 'circle_price.circle_id')
      .from(t_subscription_item)
      .join(t_price, 'circle_subscription_item.price_id', 'circle_price.id')
      .where({
        'circle_subscription_item.archived': false,
        'circle_subscription_item.user_id': user.id,
        'circle_price.circle_id': invt.circle_id,
        'circle_price.state': 'active',
      })
      .first()

    if (!item) {
      continue
    }

    // Step 2: create Matters subscription if it doesn't exist
    const subscription = await findFirst({
      table: t_subscription,
      where: { provider: 'stripe', user_id: user.id, state: 'active' },
    })

    if (!subscription) {
      continue
    }

    let mattersSubscription = await findFirst({
      table: t_subscription,
      where: { provider: 'matters', user_id: user.id, state: 'active' },
    })

    if (!mattersSubscription) {
      mattersSubscription = await insert({
        table: t_subscription,
        data: { provider: 'matters', state: 'active', user_id: user.id },
      })
    }

    // Step 3: create Matters subscription item
    const { id, ...rest } = item
    const mattersItem = await insert({
      table: t_subscription_item,
      data: {
        ...rest,
        provider: 'matters',
        subscription_id: subscription.id,
      },
    })

    // Step 4: update invitation with newly added subscription item
    await update({
      table: t_invitation,
      where: { id: invt.id },
      data: { subscription_item_id: mattersItem.id }
    })

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
        canceledStripeSubscription = await stripeAPI.subscriptions.del(
          subscription.provider_subscription_id,
          { prorate: false }
        )
      } else if (stripeItems.data.length > 1) {
        await stripeAPI.subscriptionItems.del(
          item.provider_subscription_item_id,
          { proration_behavior: 'none' }
        )
      }
    }

    // Step 6: archive Matters-Stripe subscription item
    await update({
      table: t_subscription_item,
      where: { id: item.id },
      data: { archived: true, remark: 'trial_migration' },
    })

    // Step 7: update Matters-Stripe subscription
    if (canceledStripeSubscription) {
      const record = await knex
        .count()
        .from(t_subscription_item)
        .where({ archived: false, subscription_id: subscription.id })
        .first()

      const count = parseInt(record ? `${record.count}` : '0', 10)

      if (count > 0) {
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
    }
  }
}

exports.down = async (knex) => {}
