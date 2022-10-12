import {
  BLOCKCHAIN,
  BLOCKCHAIN_CHAINID,
  PAYMENT_CURRENCY,
  PAYMENT_PROVIDER,
  TRANSACTION_PURPOSE,
  TRANSACTION_STATE,
  TRANSACTION_TARGET_TYPE,
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
  let txHash: string
  let chain: BLOCKCHAIN
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
    txHash =
      '0xd65dc6bf6dcc111237f9acfbfa6003ea4a4d88f2e071f4307d3af81ae877f7be'
    chain = BLOCKCHAIN.Polygon
  })

  test('create Transaction', async () => {
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
  test('get or create BlockchainTransaction', async () => {
    // create
    const blockchainTxn =
      await paymentService.findOrCreateBlockchainTransaction({ chain, txHash })
    expect(blockchainTxn.chainId).toEqual(BLOCKCHAIN_CHAINID.PolygonMumbai)
    expect(blockchainTxn.txHash).toEqual(txHash)
    expect(blockchainTxn.state).toEqual('pending')

    // get
    const blockchainTxn2 =
      await paymentService.findOrCreateBlockchainTransaction({ chain, txHash })
    expect(blockchainTxn2.id).toEqual(blockchainTxn.id)
  })
  test('get or create Transaction by Txhash', async () => {
    currency = PAYMENT_CURRENCY.USDT
    provider = PAYMENT_PROVIDER.blockchain

    // create
    const txn = await paymentService.findOrCreateTransactionByBlockchainTxHash({
      chain,
      txHash,
      amount,
      fee,
      state,
      purpose,
      currency,
      recipientId,
      senderId,
      targetId,
      targetType,
      remark,
    })
    const blockchainTxn =
      await paymentService.findOrCreateBlockchainTransaction({ chain, txHash })

    expect(parseInt(txn.amount, 10)).toEqual(amount)
    expect(parseFloat(txn.fee)).toEqual(fee)
    expect(txn.state).toEqual(state)
    expect(txn.purpose).toEqual(purpose)
    expect(txn.currency).toEqual(currency)
    expect(txn.provider).toEqual(provider)
    expect(txn.providerTxId).toEqual(blockchainTxn.id)
    expect(txn.recipientId).toEqual(recipientId)
    expect(txn.senderId).toEqual(senderId)
    expect(txn.targetId).toEqual(targetId)
    expect(txn.targetType).toBeDefined()
    expect(txn.remark).toEqual(txn.remark)

    // get
    const txn2 = await paymentService.findOrCreateTransactionByBlockchainTxHash(
      {
        chain,
        txHash,
        amount,
        fee,
        state,
        purpose,
        currency,
        recipientId,
        senderId,
        targetId,
        targetType,
        remark,
      }
    )
    expect(txn2.id).toEqual(txn.id)
  })
})
