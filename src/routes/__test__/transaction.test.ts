import type Stripe from 'stripe'

import {
  PAYMENT_PROVIDER,
  TRANSACTION_PURPOSE,
  PAYMENT_CURRENCY,
} from 'common/enums'
import { PaymentService } from 'connectors'

import {
  createOrUpdateUpdatedRefundTx,
  createDisputeTx,
  updateDisputeTx,
} from '../pay/stripe/transaction'

const paymentServce = new PaymentService()

// helpers

const createPayment = async () => {
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
  test('not existed payment will throw error', async () => {
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
      const tx = (
        await paymentServce.findTransactions({ providerTxId: refundObejct.id })
      )[0]
      expect(tx.state).toBe('failed')
    }
  })
})

describe('create or update dispute', () => {
  const disputeObject: Stripe.Dispute = {
    id: 'dp_1NSFCqCE0HD6LY9UAkvHZnw5',
    object: 'dispute',
    amount: 2200,
    balance_transactions: [],
    charge: 'ch_3NSFCoCE0HD6LY9U1MKsFmId',
    created: 1688976748,
    currency: 'hkd',
    evidence: {} as any,
    evidence_details: {
      due_by: 1689811199,
      has_evidence: false,
      past_due: false,
      submission_count: 0,
    },
    is_charge_refundable: false,
    livemode: false,
    metadata: {},
    payment_intent: 'pi_3NSFCoCE0HD6LY9U1UBZJeCK',
    reason: 'fraudulent',
    status: 'needs_response',
  }
  let paymentIntentId: string
  test('not existed payment will throw error', async () => {
    await expect(createDisputeTx(disputeObject)).rejects.toThrow(
      'Related payment transaction not found'
    )
  })
  test('create dispute', async () => {
    const data = await createPayment()
    if (data) {
      paymentIntentId = data.transaction.providerTxId
    }
    await createDisputeTx({ ...disputeObject, payment_intent: paymentIntentId })
    const tx = (
      await paymentServce.findTransactions({ providerTxId: disputeObject.id })
    )[0]
    expect(tx.state).toBe('succeeded')
  })
  test('update not existed dispute will throw error', async () => {
    await expect(
      updateDisputeTx({ ...disputeObject, id: 'fake_id' })
    ).rejects.toThrow('Dispute transaction not found')
  })
  test('update dispute', async () => {
    await updateDisputeTx({ ...disputeObject, payment_intent: paymentIntentId })
    const tx = (
      await paymentServce.findTransactions({ providerTxId: disputeObject.id })
    )[0]
    expect(tx.state).toBe('canceled')
  })
})
