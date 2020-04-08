import bodyParser from 'body-parser'
import { Router } from 'express'
import Stripe from 'stripe'

import { TRANSACTION_STATE } from 'common/enums'
import { environment } from 'common/environment'
import { PaymentService } from 'connectors'

const stripe = new Stripe(environment.stripeSecret, {
  apiVersion: '2020-03-02',
})
const stripeRouter = Router()

/**
 * Handling Incoming Stripe Events
 *
 * @see {@url https://stripe.com/docs/webhooks}
 */

stripeRouter.use(bodyParser.raw({ type: 'application/json' }))

stripeRouter.post('/', async (req, res) => {
  const sig = req.headers['stripe-signature'] as string

  let event: Stripe.Event | null = null

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      environment.stripeWebhookSecret
    )
  } catch (err) {
    res.status(400).send(`Webhook Error: ${err.message}`)
  }

  if (!event) {
    return res.status(400).send(`Webhook Error: empty event object`)
  }

  const paymentService = new PaymentService()

  // Handle the event
  switch (event.type) {
    case 'payment_intent.canceled':
    case 'payment_intent.payment_failed':
    case 'payment_intent.processing':
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object as Stripe.PaymentIntent

      // find transaction by payment intent id
      const transaction = (
        await paymentService.findTransactions({
          providerTxId: paymentIntent.id,
        })
      )[0]

      if (!transaction) {
        break
      }

      // update transaction's state
      const eventStateMap = {
        'payment_intent.canceled': TRANSACTION_STATE.canceled,
        'payment_intent.payment_failed': TRANSACTION_STATE.failed,
        'payment_intent.processing': TRANSACTION_STATE.pending,
        'payment_intent.succeeded': TRANSACTION_STATE.succeeded,
      }
      await paymentService.updateTransaction({
        id: transaction.id,
        state: eventStateMap[event.type],
      })

      break
    case 'charge.refunded':
      const charge = event.data.object as Stripe.Charge
      // TODO
      break
    case 'customer.deleted':
      const customer = event.data.object as Stripe.Customer
      await paymentService.deleteCustomer({ customerId: customer.id })
      break
    default:
      // Unexpected event type
      return res.status(400).end()
  }

  // Return a 200 res to acknowledge receipt of the event
  res.json({ received: true })
})

export default stripeRouter
