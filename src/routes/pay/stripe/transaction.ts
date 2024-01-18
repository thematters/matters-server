import type { Connections } from 'definitions'

import _ from 'lodash'
import Stripe from 'stripe'

import {
  PAYMENT_CURRENCY,
  PAYMENT_PROVIDER,
  TRANSACTION_PURPOSE,
  TRANSACTION_STATE,
  TRANSACTION_TARGET_TYPE,
} from 'common/enums'
import { numRound, toDBAmount } from 'common/utils'
import { NotificationService, PaymentService, UserService } from 'connectors'

const mappingTxPurposeToMailType = (type: TRANSACTION_PURPOSE) => {
  switch (type) {
    case TRANSACTION_PURPOSE.addCredit:
      return 'creditAdded'
    case TRANSACTION_PURPOSE.payout:
      return 'payout'
  }
}

export const updateTxState = async (
  {
    paymentIntent,
    eventType,
    remark,
  }: {
    paymentIntent: Stripe.PaymentIntent
    eventType:
      | 'payment_intent.canceled'
      | 'payment_intent.payment_failed'
      | 'payment_intent.processing'
      | 'payment_intent.succeeded'
    remark?: string | null
  },
  connections: Connections
) => {
  const userService = new UserService(connections)
  const paymentService = new PaymentService(connections)
  const notificationService = new NotificationService(connections)

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
  refunds: Stripe.ApiList<Stripe.Refund>,
  paymentService: PaymentService
) => {
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
        throw new Error('Related payment transaction not found')
      }

      // create a refund transaction,
      // and link with payment intent transaction
      await paymentService.createTransaction({
        amount: toDBAmount({ amount: refund.amount }),

        state: TRANSACTION_STATE.succeeded,
        currency: _.upperCase(refund.currency) as keyof typeof PAYMENT_CURRENCY,
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

export const createOrUpdateFailedRefundTx = async (
  refund: Stripe.Refund,
  paymentService: PaymentService
) => {
  const refundTx = (
    await paymentService.findTransactions({
      providerTxId: refund.id,
    })
  )[0]
  if (refundTx) {
    paymentService.markTransactionStateAs({
      id: refundTx.id,
      state: TRANSACTION_STATE.failed,
      remark: refund.failure_reason,
    })
  } else {
    const paymentTx = (
      await paymentService.findTransactions({
        providerTxId: refund.payment_intent as string,
      })
    )[0]

    // skip if related payment transaction doesn't exists
    if (!paymentTx) {
      throw new Error('Related payment transaction not found')
    }

    // create a refund transaction,
    // and link with payment intent transaction
    await paymentService.createTransaction({
      amount: toDBAmount({ amount: refund.amount }),

      state: TRANSACTION_STATE.failed,
      currency: _.upperCase(refund.currency) as keyof typeof PAYMENT_CURRENCY,
      purpose: TRANSACTION_PURPOSE.refund,

      provider: PAYMENT_PROVIDER.stripe,
      providerTxId: refund.id,

      recipientId: undefined,
      senderId: paymentTx.recipientId,

      targetId: paymentTx.id,
      targetType: TRANSACTION_TARGET_TYPE.transaction,
      remark: refund.failure_reason,
    })
  }
}

export const createDisputeTx = async (
  dispute: Stripe.Dispute,
  paymentService: PaymentService
) => {
  const disputeTx = (
    await paymentService.findTransactions({
      providerTxId: dispute.id,
    })
  )[0]
  if (disputeTx) {
    return
  } else {
    const paymentTx = (
      await paymentService.findTransactions({
        providerTxId: dispute.payment_intent as string,
      })
    )[0]

    // skip if related payment transaction doesn't exists
    if (!paymentTx) {
      throw new Error('Related payment transaction not found')
    }
    if (paymentTx.state !== TRANSACTION_STATE.succeeded) {
      throw new Error('Related payment transaction is not succeeded')
    }

    if (paymentTx.amount !== toDBAmount({ amount: dispute.amount })) {
      console.warn('Expect dispute amount to be equal to payment amount')
    }

    // create a dispute transaction,
    // and link with payment intent transaction
    await paymentService.createTransaction({
      amount: paymentTx.amount,

      state: TRANSACTION_STATE.pending,
      currency: paymentTx.currency,
      purpose: TRANSACTION_PURPOSE.dispute,

      provider: PAYMENT_PROVIDER.stripe,
      providerTxId: dispute.id,

      recipientId: undefined,
      senderId: paymentTx.recipientId,

      targetId: paymentTx.id,
      targetType: TRANSACTION_TARGET_TYPE.transaction,
      remark: dispute.reason,
    })
  }
}

export const updateDisputeTx = async (
  dispute: Stripe.Dispute,
  paymentService: PaymentService
) => {
  const disputeTx = (
    await paymentService.findTransactions({
      providerTxId: dispute.id,
    })
  )[0]
  if (!disputeTx) {
    throw new Error('Dispute transaction not found')
  }
  let state: TRANSACTION_STATE
  if (dispute.status === 'won') {
    // we won the dispute, user lost.
    state = TRANSACTION_STATE.failed
  } else if (dispute.status === 'lost') {
    state = TRANSACTION_STATE.succeeded
  } else if (dispute.status === 'warning_closed') {
    state = TRANSACTION_STATE.canceled
  } else {
    throw new Error('Expect dispute status to be won or lost or warning_closed')
  }
  await paymentService.markTransactionStateAs({
    id: disputeTx.id,
    state,
  })
}

export const createPayoutReversalTx = async (
  transfer: Stripe.Transfer,
  paymentService: PaymentService
) => {
  if (transfer.amount !== transfer.amount_reversed) {
    throw new Error('Expect transfer amount to be equal to reversed amount')
  }
  if (transfer.reversals.data.length !== 1) {
    throw new Error('Expect transfer to have only one reversal')
  }
  const payoutTx = (
    await paymentService.findTransactions({
      providerTxId: transfer.id,
    })
  )[0]
  if (!payoutTx) {
    throw new Error('Payout transaction not found')
  }
  await paymentService.createTransaction({
    amount: payoutTx.amount,

    state: TRANSACTION_STATE.succeeded,
    currency: payoutTx.currency,
    purpose: TRANSACTION_PURPOSE.payoutReversal,

    provider: PAYMENT_PROVIDER.stripe,
    providerTxId: transfer.reversals.data[0].id,

    recipientId: payoutTx.senderId,

    targetId: payoutTx.id,
    targetType: TRANSACTION_TARGET_TYPE.transaction,
  })
}
