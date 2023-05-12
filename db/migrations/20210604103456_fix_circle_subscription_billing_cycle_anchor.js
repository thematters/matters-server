require('dotenv').config()
const Stripe = require('stripe')

const circleSubscription = 'circle_subscription'

const MINUTE = 1000 * 60
const HOUR = MINUTE * 60

const getUTCNextMonthDayOne = () => {
  const date = new Date(Date.now() + 8 * HOUR)
  date.setUTCHours(0, 0, 0, 0)

  const month = date.getMonth()
  const isLastMonthOfYear = month === 11

  // set date
  date.setDate(1)

  // set month
  if (isLastMonthOfYear) {
    date.setMonth(0)
  } else {
    date.setMonth(month + 1)
  }

  // set year
  if (isLastMonthOfYear) {
    date.setFullYear(date.getFullYear() + 1)
  }

  return date.getTime()
}

const getUTCNextMonday = () => {
  const date = new Date(Date.now() + 8 * HOUR)
  date.setUTCHours(0, 0, 0, 0)

  // set date
  const offset = ((7 - date.getDay()) % 7) + 1
  date.setDate(date.getDate() + offset)

  return date.getTime()
}

exports.up = async (knex) => {
  const isProd = process.env['MATTERS_ENV'] === 'production'
  const secret = process.env['MATTERS_STRIPE_SECRET']
  const stripeAPI = new Stripe(secret, { apiVersion: '2020-08-27' })
  const envLabel = `[${process.env['MATTERS_ENV']}]`

  if (!process.env['MATTERS_ENV'] || !secret) {
    console.error('`MATTERS_ENV` and `MATTERS_STRIPE_SECRET` are required.')
    return
  }

  // retrieve active and trialing subscriptions
  const subs = await knex
    .select()
    .from(circleSubscription)
    .where({ provider: 'stripe' })
    .whereIn('state', ['active', 'trialing'])
  if (!subs || subs.length <= 0) {
    return
  }

  // reset billing cycle anchor of subscriptions based on UTC+0
  const total = (subs || []).length
  for (const [index, sub] of subs.entries()) {
    try {
      const stripeSubId = sub.provider_subscription_id
      console.log('-------------------------------')
      console.log(
        `${envLabel} Process ${index + 1}/${total} subscription: ${stripeSubId}`
      )

      const trialEndAt =
        (isProd ? getUTCNextMonthDayOne() : getUTCNextMonday()) / 1000

      await stripeAPI.subscriptions.update(stripeSubId, {
        trial_end: trialEndAt,
        proration_behavior: 'none',
      })
      console.log(`${envLabel} Reset ${stripeSubId} to ${trialEndAt}`)
    } catch (error) {
      console.error(error)
      console.error(`${envLabel} Failed to process item: ${sub.id}`)
    }
  }
}

exports.down = async () => {}
