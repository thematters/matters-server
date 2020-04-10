import bodyParser from 'body-parser'
import { Router } from 'express'
import Stripe from 'stripe'

import {
  PAYMENT_CURRENCY,
  PAYMENT_PROVIDER,
  TRANSACTION_PURPOSE,
  TRANSACTION_STATE,
  TRANSACTION_TARGET_TYPE,
} from 'common/enums'
import { environment } from 'common/environment'
import logger from 'common/logger'
import { toDBAmount } from 'common/utils'
import { PaymentService } from 'connectors'

const paymentService = new PaymentService()

const stripe = new Stripe(environment.stripeSecret, {
  apiVersion: '2020-03-02',
})

const stripeRouter = Router()

const updateTxState = async (
  paymentIntent: Stripe.PaymentIntent,
  eventType:
    | 'payment_intent.canceled'
    | 'payment_intent.payment_failed'
    | 'payment_intent.processing'
    | 'payment_intent.succeeded'
) => {
  // find transaction by payment intent id
  const transaction = (
    await paymentService.findTransactions({
      providerTxId: paymentIntent.id,
    })
  )[0]

  if (!transaction) {
    return
  }

  // update transaction's state
  const eventStateMap = {
    'payment_intent.canceled': TRANSACTION_STATE.canceled,
    'payment_intent.payment_failed': TRANSACTION_STATE.failed,
    'payment_intent.processing': TRANSACTION_STATE.pending,
    'payment_intent.succeeded': TRANSACTION_STATE.succeeded,
  }

  await paymentService.markTransactionStateAs({
    id: transaction.id,
    state: eventStateMap[eventType],
  })
}

const createRefundTxs = async (refunds: Stripe.ApiList<Stripe.Refund>) => {
  await Promise.all(
    refunds.data.map(async (refund) => {
      const refundTx = (
        await paymentService.findTransactions({
          providerTxId: refund.id,
        })
      )[0]

      // skip if refund transaction exists
      if (refundTx) {
        return
      }

      const paymentTx = (
        await paymentService.findTransactions({
          providerTxId: refund.payment_intent as string,
        })
      )[0]

      // skip if payment transaction exists
      if (!paymentTx) {
        return
      }

      // create a refund transaction,
      // and link with payment intent transaction
      await paymentService.createTransaction({
        amount: toDBAmount({ amount: refund.amount }),
        state: TRANSACTION_STATE.succeeded,
        currency: refund.currency as PAYMENT_CURRENCY,
        purpose: TRANSACTION_PURPOSE.refund,

        provider: PAYMENT_PROVIDER.stripe,
        providerTxId: refund.id,

        recipientId: undefined,
        senderId: paymentTx.recipientId,

        targetId: paymentTx.id,
        targetType: TRANSACTION_TARGET_TYPE.transaction,
      })
    })
  )
}

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
    logger.error(err)
    res.status(400).send(`Webhook Error: ${err.message}`)
  }

  if (!event) {
    return res.status(400).send(`Webhook Error: empty event object`)
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.canceled':
    case 'payment_intent.payment_failed':
    case 'payment_intent.processing':
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object as Stripe.PaymentIntent
      await updateTxState(paymentIntent, event.type)
      break
    case 'charge.refunded':
      const charge = event.data.object as Stripe.Charge
      await createRefundTxs(charge.refunds)
      break
    case 'customer.deleted':
      const customer = event.data.object as Stripe.Customer
      await paymentService.deleteCustomer({ customerId: customer.id })
      break
    default:
      logger.error('Unexpected event type', event.type)
      break
  }

  // Return a 200 res to acknowledge receipt of the event
  res.json({ received: true })
})

export default stripeRouter
