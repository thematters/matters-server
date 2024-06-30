import bodyParser from 'body-parser'
import { RequestHandler, Router } from 'express'
import Stripe from 'stripe'

import { USER_BAN_REMARK, OFFICIAL_NOTICE_EXTEND_TYPE } from 'common/enums'
import { environment } from 'common/environment'
import { getLogger } from 'common/logger'
import { toDBAmount } from 'common/utils'
import { PaymentService, UserService } from 'connectors'
import SlackService from 'connectors/slack'

import { connections } from '../../connections'

import {
  completeCircleInvoice,
  completeCircleSubscription,
  updateSubscription,
} from './circle'
import { updateCustomerCard } from './customer'
import {
  createRefundTxs,
  updateTxState,
  createOrUpdateFailedRefundTx,
  createDisputeTx,
  updateDisputeTx,
  createPayoutReversalTx,
} from './transaction'

const logger = getLogger('route-stripe')

const stripeRouter = Router()

/**
 * Handling Incoming Stripe Events
 *
 * @see {@url https://stripe.com/docs/webhooks}
 */
stripeRouter.use(bodyParser.raw({ type: 'application/json' }) as RequestHandler)

stripeRouter.post('/', async (req, res) => {
  const paymentService = new PaymentService(connections)
  const userService = new UserService(connections)
  const slack = new SlackService()
  const stripe = paymentService.stripe.stripeAPI

  const sig = req.headers['stripe-signature'] as string

  let event: Stripe.Event | null = null

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      environment.stripeWebhookSecret
    )
  } catch (err: unknown) {
    if (err instanceof Error) {
      logger.error(err)
      slack.sendStripeAlert({
        data: {
          id: event?.id,
          type: event?.type,
        },
        message: 'Signature verification failed',
      })
      res.status(400).send(`Webhook Error: ${err.message}`)
    } else {
      logger.error('Unknown error', err)
      slack.sendStripeAlert({
        message: 'Unknown error',
      })
      res.status(400).send(`Webhook Error: unknown error`)
    }
  }
  logger.info('Received event', event)

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
      case 'payment_intent.canceled': {
        const canceled = event.data.object as Stripe.PaymentIntent
        await updateTxState(
          {
            paymentIntent: canceled,
            eventType: event.type,
            remark: canceled.cancellation_reason,
          },
          connections
        )
        break
      }
      case 'payment_intent.payment_failed': {
        const failed = event.data.object as Stripe.PaymentIntent
        await updateTxState(
          {
            paymentIntent: failed,
            eventType: event.type,
            remark: failed.last_payment_error?.code,
          },
          connections
        )

        // if payment is high risk, ban user and send slack alert

        // @ts-ignore
        const outcome = failed.charges?.data[0]?.outcome
        if (outcome && outcome.risk_level === 'highest') {
          const tx = (
            await paymentService.findTransactions({
              providerTxId: failed.id,
            })
          )[0]
          await userService.banUser(tx.recipientId, {
            remark: USER_BAN_REMARK.paymentHighRisk,
            noticeType: OFFICIAL_NOTICE_EXTEND_TYPE.user_banned_payment,
          })
          const user = await userService.baseFindById(tx.recipientId)
          slack.sendPaymentAlert({
            message: `user ${user?.userName} banned due to high risk payment`,
          })
        }
        break
      }
      case 'payment_intent.processing':
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        await updateTxState(
          { paymentIntent: paymentIntent, eventType: event.type },
          connections
        )
        break
      }
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        await completeCircleInvoice({ invoice, event }, connections)
        break
      }
      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge
        if (charge.refunds === null) {
          throw new Error('No refunds found in charge.refunded event')
        }

        // create refunx tnxs with the status 'succeeded' instead of 'pending'
        // to prevent users spend these funds before tnxs are settled.
        await createRefundTxs(charge.refunds, paymentService)

        slack.sendStripeAlert({
          message: `Refund created for ${toDBAmount({
            amount: charge.amount,
          })} ${charge.currency}`,
        })
        break
      }
      case 'charge.refund.updated': {
        const refund = event.data.object as Stripe.Refund

        // ignore if refund is succeeded
        if (refund.status === 'succeeded') {
          break
        }

        await createOrUpdateFailedRefundTx(refund, paymentService)
        slack.sendStripeAlert({
          message: `Refund for ${toDBAmount({ amount: refund.amount })} ${
            refund.currency
          } failed`,
        })
        break
      }
      case 'charge.dispute.created': {
        const dispute = event.data.object as Stripe.Dispute
        await createDisputeTx(dispute, paymentService)
        slack.sendStripeAlert({
          message: `Dispute created for ${toDBAmount({
            amount: dispute.amount,
          })} ${dispute.currency}`,
        })
        break
      }
      case 'charge.dispute.closed': {
        const dispute = event.data.object as Stripe.Dispute
        await updateDisputeTx(dispute, paymentService)
        break
      }
      case 'transfer.reversed': {
        const transfer = event.data.object as Stripe.Transfer
        await createPayoutReversalTx(transfer, paymentService)

        // if payout is reversed, ban user and send slack alert

        const payoutTx = (
          await paymentService.findTransactions({
            providerTxId: transfer.id,
          })
        )[0]
        await userService.banUser(payoutTx.senderId, {
          remark: USER_BAN_REMARK.payoutReversedByAdmin,
          noticeType: OFFICIAL_NOTICE_EXTEND_TYPE.user_banned_payment,
        })
        const user = await userService.baseFindById(payoutTx.senderId)
        slack.sendPaymentAlert({
          message: `user ${user?.userName} banned due to payout reversed`,
        })
        break
      }
      case 'customer.deleted': {
        const customer = event.data.object as Stripe.Customer
        await paymentService.deleteCustomer({ customerId: customer.id })
        break
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.trial_will_end':
      case 'customer.subscription.deleted':
      case 'customer.subscription.pending_update_applied':
      case 'customer.subscription.pending_update_expired': {
        const subscription = event.data.object as Stripe.Subscription
        await updateSubscription({ subscription, event }, connections)
        break
      }
      case 'setup_intent.succeeded': {
        const setupIntent = event.data.object as Stripe.SetupIntent
        const dbCustomer = await updateCustomerCard(
          { setupIntent, event },
          connections
        )

        if (dbCustomer) {
          await completeCircleSubscription(
            { setupIntent, dbCustomer, event },
            connections
          )
        }

        break
      }
      default:
        logger.error('Unexpected event type', event.type)
        slack.sendStripeAlert({
          data: slackEventData,
          message: 'Unexpected event type',
        })
        break
    }
  } catch (err: any) {
    logger.error(err)
    slack.sendStripeAlert({
      data: slackEventData,
      message: `Server error: ${err.message}`,
    })
    throw err
  }

  // Return a 200 res to acknowledge receipt of the event
  res.json({ received: true })
})

export default stripeRouter
