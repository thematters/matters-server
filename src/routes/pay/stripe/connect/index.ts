import bodyParser from 'body-parser'
import { Router } from 'express'
import Stripe from 'stripe'

import { environment } from 'common/environment'
import logger from 'common/logger'
import SlackService from 'connectors/slack'

import { updateAccount } from './account'

const stripe = new Stripe(environment.stripeSecret, {
  apiVersion: '2020-08-27',
})

const stripeRouter = Router()

/**
 * Handling Incoming Stripe Events (from Connect)
 *
 * @see {@url https://stripe.com/docs/webhooks}
 */
stripeRouter.use(bodyParser.raw({ type: 'application/json' }))

stripeRouter.post('/', async (req, res) => {
  const slack = new SlackService()

  const sig = req.headers['stripe-signature'] as string

  let event: Stripe.Event | null = null

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      environment.stripeConnectWebhookSecret
    )
  } catch (err) {
    logger.error(err)
    slack.sendStripeAlert({
      data: {
        id: event?.id,
        type: event?.type,
      },
      message: 'Signature verification failed',
    })
    res.status(400).send(`Webhook Error: ${err.message}`)
  }

  if (!event) {
    slack.sendStripeAlert({ message: 'Empty event object' })
    return res.status(400).send(`Webhook Error: empty event object`)
  }

  const slackEventData = {
    id: event.id,
    type: event.type,
  }

  try {
    // Handle the event
    switch (event.type) {
      case 'account.updated':
        const account = event.data.object as Stripe.Account
        await updateAccount({ account, event })
        break
      default:
        logger.error('[Connect] Unexpected event type', event.type)
        slack.sendStripeAlert({
          data: slackEventData,
          message: '[Connect] Unexpected event type',
        })
        break
    }
  } catch (error) {
    logger.error(error)
    slack.sendStripeAlert({
      data: slackEventData,
      message: `Server error: ${error.message}`,
    })
    throw error
  }

  // Return a 200 res to acknowledge receipt of the event
  res.json({ received: true })
})

export default stripeRouter
