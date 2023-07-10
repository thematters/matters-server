import type Stripe from 'stripe'

import {
  PAYMENT_PROVIDER,
  TRANSACTION_PURPOSE,
  PAYMENT_CURRENCY,
} from 'common/enums'
import { PaymentService } from 'connectors'

import { createOrUpdateUpdatedRefundTx } from '../pay/stripe/transaction'

const updatedRefundObject: Stripe.Refund = {
  id: 're_3NSAb5CE0HD6LY9U1oqPdMAs',
  object: 'refund',
  amount: 10000,
  balance_transaction: 'txn_3NSAb5CE0HD6LY9U1AZXdhRu',
  charge: 'ch_3NSAb5CE0HD6LY9U1Vnj9jmv',
  created: 1688959171,
  currency: 'hkd',
  failure_balance_transaction: 'txn_1NSAdPCE0HD6LY9Ud6MFCOAj',
  failure_reason: 'expired_or_canceled_card',
  metadata: {},
  payment_intent: 'pi_3NSAb5CE0HD6LY9U1d36lTeR',
  reason: 'fraudulent',
  receipt_number: null,
  source_transfer_reversal: null,
  status: 'failed',
  transfer_reversal: null,
}

// helpers

const createPayment = async () => {
  const paymentServce = new PaymentService()
  const user = {
    id: '1',
    email: 'test@matters.news',
  }
  const customer = await paymentServce.createCustomer({
    user,
    provider: PAYMENT_PROVIDER.stripe,
  })
  return await paymentServce.createPayment({
    userId: user.id,
    customerId: customer.id,
    amount: 100,
    purpose: TRANSACTION_PURPOSE.addCredit,
    provider: PAYMENT_PROVIDER.stripe,
    currency: PAYMENT_CURRENCY.HKD,
  })
}

describe('createOrUpdateRefundTxs', () => {
  test('not exsit payment will throw error', async () => {
    await expect(
      createOrUpdateUpdatedRefundTx(updatedRefundObject)
    ).rejects.toThrow('Related payment transaction not found')
  })
  test('updated refund create or update transaction', async () => {
    const data = await createPayment()
    let paymentIntentId: string
    if (data) {
      paymentIntentId = data.transaction.providerTxId
      const refundObejct = {
        ...updatedRefundObject,
        payment_intent: paymentIntentId,
      }
      await createOrUpdateUpdatedRefundTx(refundObejct)
      const paymentServce = new PaymentService()
      const tx = (
        await paymentServce.findTransactions({ providerTxId: refundObejct.id })
      )[0]
      expect(tx.state).toBe('failed')
    }
  })
})
