import {
  PAYMENT_CURRENCY,
  PAYMENT_PROVIDER,
  TRANSACTION_PURPOSE,
  TRANSACTION_STATE,
  TRANSACTION_TARGET_TYPE,
  // BLOCKCHAIN,
  // BLOCKCHAIN_CHAINID,
} from 'common/enums'
import { PaymentService } from 'connectors'

const paymentService = new PaymentService()

describe('Transaction CRUD', () => {
  let amount: number
  let fee: number
  let state: TRANSACTION_STATE
  let purpose: TRANSACTION_PURPOSE
  let currency: PAYMENT_CURRENCY
  let provider: PAYMENT_PROVIDER
  let providerTxId: string
  let recipientId: string
  let senderId: string
  let targetId: string
  let targetType: TRANSACTION_TARGET_TYPE
  let remark: string
  beforeEach(async () => {
    amount = 1
    fee = 0.1
    state = TRANSACTION_STATE.pending
    purpose = TRANSACTION_PURPOSE.donation
    currency = PAYMENT_CURRENCY.HKD
    provider = PAYMENT_PROVIDER.matters
    providerTxId = 'testProviderTxId'
    recipientId = (await paymentService.knex('user').first('id')).id
    senderId = (
      await paymentService
        .knex('user')
        .where('id', '!=', recipientId)
        .first('id')
    ).id
    targetId = '1'
    targetType = TRANSACTION_TARGET_TYPE.article
    remark = 'testRemark'
  })

  it('create Transaction', async () => {
    const txn = await paymentService.createTransaction({
      amount,
      fee,
      state,
      purpose,
      currency,
      provider,
      providerTxId,
      recipientId,
      senderId,
      targetId,
      targetType,
      remark,
    })
    expect(parseInt(txn.amount, 10)).toEqual(amount)
    expect(parseFloat(txn.fee)).toEqual(fee)
    expect(txn.state).toEqual(state)
    expect(txn.purpose).toEqual(purpose)
    expect(txn.currency).toEqual(currency)
    expect(txn.provider).toEqual(provider)
    expect(txn.providerTxId).toEqual(providerTxId)
    expect(txn.recipientId).toEqual(recipientId)
    expect(txn.senderId).toEqual(senderId)
    expect(txn.targetId).toEqual(targetId)
    expect(txn.targetType).toBeDefined()
    expect(txn.remark).toEqual(txn.remark)
  })
})
