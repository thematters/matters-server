import bodyParser from 'body-parser'
import { Router } from 'express'
import _ from 'lodash'
import Stripe from 'stripe'

import { environment } from 'common/environment'
import logger from 'common/logger'
import { PaymentService } from 'connectors'
import SlackService from 'connectors/slack'

import {
  completeCircleInvoice,
  completeCircleSubscription,
  updateSubscription,
} from './circle'
import { updateCustomerCard } from './customer'
import { updateAccount } from './payout'
import { createRefundTxs, updateTxState } from './transaction'

const stripe = new Stripe(environment.stripeSecret, {
  apiVersion: '2020-08-27',
})

const stripeRouter = Router()

/**
 * Handling Incoming Stripe Events
 *
 * @see {@url https://stripe.com/docs/webhooks}
 */
stripeRouter.use(bodyParser.raw({ type: 'application/json' }))

stripeRouter.post('/', async (req, res) => {
  const paymentService = new PaymentService()
  const slack = new SlackService()

  const sig = req.headers['stripe-signature'] as string

  let event: Stripe.Event | null = null

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      environment.stripeWebhookSecret
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
      case 'payment_intent.canceled':
        const canceled = event.data.object as Stripe.PaymentIntent
        await updateTxState(canceled, event.type, canceled.cancellation_reason)
        break
      case 'payment_intent.payment_failed':
        const failed = event.data.object as Stripe.PaymentIntent
        await updateTxState(failed, event.type, failed.last_payment_error?.code)
        break
      case 'payment_intent.processing':
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        await updateTxState(paymentIntent, event.type)
        break
      case 'invoice.payment_succeeded':
        const invoice = event.data.object as Stripe.Invoice
        await completeCircleInvoice({ invoice, event })
        break
      case 'charge.refunded':
        const charge = event.data.object as Stripe.Charge
        await createRefundTxs(charge.refunds)
        break
      case 'account.updated':
        const account = event.data.object as Stripe.Account
        await updateAccount({ account, event })
        break
      case 'customer.deleted':
        const customer = event.data.object as Stripe.Customer
        await paymentService.deleteCustomer({ customerId: customer.id })
        break
      case 'customer.subscription.updated':
      case 'customer.subscription.trial_will_end':
      case 'customer.subscription.deleted':
      case 'customer.subscription.pending_update_applied':
      case 'customer.subscription.pending_update_expired': {
        const subscription = event.data.object as Stripe.Subscription
        await updateSubscription({ subscription, event })
        break
      }
      case 'setup_intent.succeeded':
        const setupIntent = event.data.object as Stripe.SetupIntent
        const dbCustomer = await updateCustomerCard({ setupIntent, event })

        if (dbCustomer) {
          await completeCircleSubscription({ setupIntent, dbCustomer, event })
        }

        break
      default:
        logger.error('Unexpected event type', event.type)
        slack.sendStripeAlert({
          data: slackEventData,
          message: 'Unexpected event type',
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
