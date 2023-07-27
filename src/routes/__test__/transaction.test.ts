import type Stripe from 'stripe'

import {
  PAYMENT_PROVIDER,
  TRANSACTION_PURPOSE,
  PAYMENT_CURRENCY,
  TRANSACTION_STATE,
} from 'common/enums'
import { PaymentService } from 'connectors'

import {
  createOrUpdateFailedRefundTx,
  createDisputeTx,
  updateDisputeTx,
  createPayoutReversalTx,
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
      createOrUpdateFailedRefundTx(updatedRefundObject)
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
      await createOrUpdateFailedRefundTx(refundObejct)
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
    await expect(
      createDisputeTx({ ...disputeObject, payment_intent: paymentIntentId })
    ).rejects.toThrow('Related payment transaction is not succeeded')

    await paymentServce.markTransactionStateAs({
      id: data?.transaction.id,
      state: TRANSACTION_STATE.succeeded,
    })

    await createDisputeTx({ ...disputeObject, payment_intent: paymentIntentId })

    const tx = (
      await paymentServce.findTransactions({ providerTxId: disputeObject.id })
    )[0]
    expect(tx.state).toBe('pending')
  })
  test('update not existed dispute will throw error', async () => {
    await expect(
      updateDisputeTx({ ...disputeObject, id: 'fake_id' })
    ).rejects.toThrow('Dispute transaction not found')
  })
  test('update dispute', async () => {
    await updateDisputeTx({
      ...disputeObject,
      payment_intent: paymentIntentId,
      status: 'lost',
    })
    const tx = (
      await paymentServce.findTransactions({ providerTxId: disputeObject.id })
    )[0]
    expect(tx.state).toBe('succeeded')
  })
})

describe('update payout', () => {
  const transferObject: Stripe.Transfer = {
    id: 'tr_1NSHTXCE0HD6LY9UruEkYFSz',
    object: 'transfer',
    amount: 100,
    amount_reversed: 100,
    balance_transaction: 'txn_1NSHTYCE0HD6LY9UMZBAf4jw',
    created: 1688985471,
    currency: 'usd',
    description: null,
    destination: 'acct_1MdrcWFfKdlnxiKX',
    destination_payment: 'py_1NSHTXFfKdlnxiKXmk8xBHye',
    livemode: false,
    metadata: {
      db_tx_id: '21056',
    },
    reversals: {
      object: 'list',
      data: [
        {
          id: 'trr_1NXNmDCE0HD6LY9UBtCg1mZs',
          object: 'transfer_reversal',
          amount: 5172,
          balance_transaction: 'txn_1NXNmDCE0HD6LY9UvcUF2cHa',
          created: 1690201333,
          currency: 'usd',
          destination_payment_refund: 'pyr_1NXNmDFwNmhhVYjPjpwqJNqt',
          metadata: {},
          source_refund: null,
          transfer: 'tr_1NXNksCE0HD6LY9UavAWLkJv',
        },
      ],
      has_more: false,
      url: '/v1/transfers/tr_1NSHTXCE0HD6LY9UruEkYFSz/reversals',
    },

    reversed: false,
    source_transaction: null,
    source_type: 'card',
    transfer_group: null,
  }
  test('not existed payout tx will throw error', async () => {
    await expect(createPayoutReversalTx(transferObject)).rejects.toThrow(
      'Payout transaction not found'
    )
  })
  test('amount_reversed not equal amount will throw error', async () => {
    await expect(
      createPayoutReversalTx({ ...transferObject, amount_reversed: 50 })
    ).rejects.toThrow('Expect transfer amount to be equal to reversed amount')
  })
})
