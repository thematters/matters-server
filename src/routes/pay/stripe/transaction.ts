import _ from 'lodash'
import Stripe from 'stripe'

import {
  PAYMENT_CURRENCY,
  PAYMENT_PROVIDER,
  TRANSACTION_PURPOSE,
  TRANSACTION_STATE,
  TRANSACTION_TARGET_TYPE,
} from 'common/enums/index.js'
import { numRound, toDBAmount } from 'common/utils/index.js'
import {
  NotificationService,
  PaymentService,
  UserService,
} from 'connectors/index.js'

const mappingTxPurposeToMailType = (type: TRANSACTION_PURPOSE) => {
  switch (type) {
    case TRANSACTION_PURPOSE.addCredit:
      return 'creditAdded'
    case TRANSACTION_PURPOSE.payout:
      return 'payout'
  }
}

export const updateTxState = async (
  paymentIntent: Stripe.PaymentIntent,
  eventType:
    | 'payment_intent.canceled'
    | 'payment_intent.payment_failed'
    | 'payment_intent.processing'
    | 'payment_intent.succeeded',
  remark?: string | null
) => {
  const userService = new UserService()
  const paymentService = new PaymentService()
  const notificationService = new NotificationService()

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

  const tx = await paymentService.markTransactionStateAs({
    id: transaction.id,
    state: eventStateMap[eventType],
    remark,
  })

  // trigger notifications
  const mailType = mappingTxPurposeToMailType(tx.purpose)
  if (eventType === 'payment_intent.succeeded' && mailType) {
    const recipient = await userService.baseFindById(tx.recipientId)
    notificationService.mail.sendPayment({
      to: recipient.email,
      recipient: {
        displayName: recipient.displayName,
        userName: recipient.userName,
      },
      type: mailType,
      tx: {
        recipient,
        amount: numRound(tx.amount),
        currency: tx.currency,
      },
      language: recipient.language,
    })
  }
}

export const createRefundTxs = async (
  refunds: Stripe.ApiList<Stripe.Refund>
) => {
  const paymentService = new PaymentService()

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

      // skip if related payment transaction doesn't exists
      if (!paymentTx) {
        return
      }

      // create a refund transaction,
      // and link with payment intent transaction
      await paymentService.createTransaction({
        amount: toDBAmount({ amount: refund.amount }),

        state: TRANSACTION_STATE.succeeded,
        currency: _.upperCase(refund.currency) as PAYMENT_CURRENCY,
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
