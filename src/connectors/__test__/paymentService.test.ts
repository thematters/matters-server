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
import { GQLChain } from 'definitions'

const paymentService = new PaymentService()

describe('Transaction CRUD', () => {
  const amount = 1
  const fee = 0.1
  const state = TRANSACTION_STATE.pending
  const purpose = TRANSACTION_PURPOSE.donation
  const currency = PAYMENT_CURRENCY.HKD
  const provider = PAYMENT_PROVIDER.matters
  const providerTxId = 'testProviderTxId'
  const recipientId = '1'
  const senderId = '2'
  const targetId = '1'
  const targetType = TRANSACTION_TARGET_TYPE.article
  const remark = 'testRemark'
  const txHash =
    '0xd65dc6bf6dcc111237f9acfbfa6003ea4a4d88f2e071f4307d3af81ae877f7be'
  const txHashUppercase =
    '0xD65DC6BF6DCC111237F9ACFBFA6003EA4A4D88F2E071F4307D3AF81AE877F7BE'
  const chain = BLOCKCHAIN.Polygon.valueOf() as GQLChain

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
    expect(blockchainTxn.chainId).toEqual(
      BLOCKCHAIN_CHAINID.Polygon.PolygonMumbai
    )
    expect(blockchainTxn.txHash).toEqual(txHash)
    expect(blockchainTxn.state).toEqual('pending')

    // get
    const blockchainTxn2 =
      await paymentService.findOrCreateBlockchainTransaction({ chain, txHash })
    expect(blockchainTxn2.id).toEqual(blockchainTxn.id)
    // get with uppercase txHash
    const blockchainTxn3 =
      await paymentService.findOrCreateBlockchainTransaction({
        chain,
        txHash: txHashUppercase,
      })
    expect(blockchainTxn3.id).toEqual(blockchainTxn.id)
  })
  test('get or create Transaction by Txhash', async () => {
    const currencyUSDT = PAYMENT_CURRENCY.USDT

    // create
    const txn = await paymentService.findOrCreateTransactionByBlockchainTxHash({
      chain,
      txHash,
      amount,
      fee,
      state,
      purpose,
      currency: currencyUSDT,
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
    expect(txn.currency).toEqual(currencyUSDT)
    expect(txn.provider).toEqual(PAYMENT_PROVIDER.blockchain)
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
        currency: currencyUSDT,
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
