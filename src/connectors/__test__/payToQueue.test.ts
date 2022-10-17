import {
  BLOCKCHAIN,
  BLOCKCHAIN_TRANSACTION_STATE,
  PAYMENT_CURRENCY,
  PAYMENT_PROVIDER,
  TRANSACTION_PURPOSE,
  TRANSACTION_STATE,
  TRANSACTION_TARGET_TYPE,
} from 'common/enums'
import { PaymentQueueJobDataError } from 'common/errors'
import { payToByBlockchainQueue, payToByMattersQueue } from 'connectors/queue'
import { GQLChain } from 'definitions'

import { getQueueResult } from './utils'

describe('payToByMattersQueue', () => {
  const queue = payToByMattersQueue
  test('job with wrong tx id will fail', async () => {
    const wrongTxId = { txId: '12345' }
    queue.payTo(wrongTxId)
    await expect(getQueueResult(queue.q)).rejects.toThrow(
      PaymentQueueJobDataError
    )
  })
})

describe('payToByBlockchainQueue', () => {
  const amount = 1
  const state = TRANSACTION_STATE.pending
  const purpose = TRANSACTION_PURPOSE.donation
  const currency = PAYMENT_CURRENCY.USDT
  const provider = PAYMENT_PROVIDER.blockchain
  const invalidProviderTxId = '12345'
  const recipientId = '1'
  const senderId = '2'
  const targetId = '1'
  const targetType = TRANSACTION_TARGET_TYPE.article
  const queue = payToByBlockchainQueue
  const chain = BLOCKCHAIN.Polygon.valueOf() as GQLChain
  const txHash =
    '0xd65dc6bf6dcc111237f9acfbfa6003ea4a4d88f2e071f4307d3af81ae877f7be'
  test('job with wrong tx id will fail', async () => {
    const wrongTxId = '12345'
    queue.payTo({ txId: wrongTxId })
    await expect(getQueueResult(queue.q)).rejects.toThrow(
      new PaymentQueueJobDataError('pay-to pending tx not found')
    )
  })
  test('tx with wrong provier will fail', async () => {
    const tx = await queue.paymentService.createTransaction({
      amount,
      state,
      purpose,
      currency,
      provider: PAYMENT_PROVIDER.matters,
      providerTxId: invalidProviderTxId + '1',
      recipientId,
      senderId,
      targetId,
      targetType,
    })
    queue.payTo({ txId: tx.id })
    await expect(getQueueResult(queue.q)).rejects.toThrow(
      new PaymentQueueJobDataError('wrong pay-to queue')
    )
  })
  test('tx with wrong providerTxId will fail', async () => {
    const tx = await queue.paymentService.createTransaction({
      amount,
      state,
      purpose,
      currency,
      provider,
      providerTxId: invalidProviderTxId + '2',
      recipientId,
      senderId,
      targetId,
      targetType,
    })
    queue.payTo({ txId: tx.id })
    await expect(getQueueResult(queue.q)).rejects.toThrow(
      new PaymentQueueJobDataError('blockchain transaction not found')
    )
  })
  test('timeout error of waitForTransaction will mark blockchainTx as timeout', async () => {
    const tx =
      await queue.paymentService.findOrCreateTransactionByBlockchainTxHash({
        chain,
        txHash,
        amount,
        state,
        purpose,
        currency,
        recipientId,
        senderId,
        targetId,
        targetType,
      })
    queue.txTimeout = 1
    queue.payTo({ txId: tx.id })
    expect(await getQueueResult(queue.q)).toStrictEqual({ txId: tx.id })
    const blockchainTx = await queue.paymentService.baseFindById(
      tx.providerTxId,
      'blockchain_transaction'
    )
    expect(blockchainTx.state).toBe(BLOCKCHAIN_TRANSACTION_STATE.timeout)
    queue.txTimeout = 10000
  })
  test('failed blockchain transation will mark transaction and blockchainTx as failed', async () => {
    const failedTxhash =
      '0xbad52ae6172aa85e1f883967215cbdc5e70ddc479c7ee22da3c23d06820ee29e'
    const tx =
      await queue.paymentService.findOrCreateTransactionByBlockchainTxHash({
        chain,
        txHash: failedTxhash,
        amount,
        state,
        purpose,
        currency,
        recipientId,
        senderId,
        targetId,
        targetType,
      })
    queue.payTo({ txId: tx.id })
    expect(await getQueueResult(queue.q)).toStrictEqual({ txId: tx.id })
    const ret = await queue.paymentService.baseFindById(tx.id)
    expect(ret.state).toBe(TRANSACTION_STATE.failed)
    const blockchainTx = await queue.paymentService.baseFindById(
      tx.providerTxId,
      'blockchain_transaction'
    )
    expect(blockchainTx.state).toBe(BLOCKCHAIN_TRANSACTION_STATE.reverted)
  })
})
