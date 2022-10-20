import {
  BLOCKCHAIN,
  BLOCKCHAIN_TRANSACTION_STATE,
  PAYMENT_CURRENCY,
  PAYMENT_PROVIDER,
  TRANSACTION_PURPOSE,
  TRANSACTION_REMARK,
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
    const job = await queue.payTo(wrongTxId)
    await expect(getQueueResult(queue.q, job.id)).rejects.toThrow(
      PaymentQueueJobDataError
    )
  })
})

describe('payToByBlockchainQueue.payTo', () => {
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
  beforeAll(async () => {
    queue.delay = 1
  })

  test.only('job with wrong tx id will fail', async () => {
    const wrongTxId = '12345'
    const job = await queue.payTo({ txId: wrongTxId })
    await expect(getQueueResult(queue.q, job.id)).rejects.toThrow(
      new PaymentQueueJobDataError('pay-to pending tx not found')
    )
    expect(await job.getState()).toBe('failed')
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
    const job = await queue.payTo({ txId: tx.id })
    await expect(getQueueResult(queue.q, job.id)).rejects.toThrow(
      new PaymentQueueJobDataError('wrong pay-to queue')
    )
    expect(await job.getState()).toBe('failed')
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
    const job = await queue.payTo({ txId: tx.id })
    await expect(getQueueResult(queue.q, job.id)).rejects.toThrow(
      new PaymentQueueJobDataError('blockchain transaction not found')
    )
    expect(await job.getState()).toBe('failed')
  })
  test('not mined tx will fail and retry', async () => {
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
    const job = await queue.payTo({ txId: tx.id })
    await expect(getQueueResult(queue.q, job.id)).rejects.toThrow(
      new PaymentQueueJobDataError('blockchain transaction not mined')
    )
    expect(await job.getState()).toBe('active')
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
    const job = await queue.payTo({ txId: tx.id })
    expect(await getQueueResult(queue.q, job.id)).toStrictEqual({ txId: tx.id })
    const ret = await queue.paymentService.baseFindById(tx.id)
    expect(ret.state).toBe(TRANSACTION_STATE.failed)
    const blockchainTx = await queue.paymentService.baseFindById(
      tx.providerTxId,
      'blockchain_transaction'
    )
    expect(blockchainTx.state).toBe(BLOCKCHAIN_TRANSACTION_STATE.reverted)
  })
  test('succeeded invalid blockchain transaction will mark transaction as canceled', async () => {
    const invalidTxhash =
      '0x209375f2de9ee7c2eed5e24eb30d0196a416924cd956a194e7060f9dcb39515b'
    const tx =
      await queue.paymentService.findOrCreateTransactionByBlockchainTxHash({
        chain,
        txHash: invalidTxhash,
        amount,
        state,
        purpose,
        currency,
        recipientId,
        senderId,
        targetId,
        targetType,
      })
    const job = await queue.payTo({ txId: tx.id })
    expect(await getQueueResult(queue.q, job.id)).toStrictEqual({ txId: tx.id })
    const ret = await queue.paymentService.baseFindById(tx.id)
    expect(ret.state).toBe(TRANSACTION_STATE.canceled)
    expect(ret.remark).toBe(TRANSACTION_REMARK.INVALID)
    const blockchainTx = await queue.paymentService.baseFindById(
      tx.providerTxId,
      'blockchain_transaction'
    )
    expect(blockchainTx.state).toBe(BLOCKCHAIN_TRANSACTION_STATE.succeeded)
  })
  test('succeeded valid blockchain transaction will mark transaction and blockchainTx as succeeded', async () => {
    const validTxhash =
      '0x649cf52a3c7b6ba16e1d52d4fc409c9ca1307329e691147990abe59c8c16215c'
    const curator = await queue.userService.create({
      userName: 'curator',
      ethAddress: '0x0ee160cb17e33d5ae367741992072942dfe70cba',
    })
    const tx =
      await queue.paymentService.findOrCreateTransactionByBlockchainTxHash({
        chain,
        txHash: validTxhash,
        amount,
        state,
        purpose,
        currency,
        recipientId,
        senderId: curator.id,
        targetId,
        targetType,
      })
    const job = await queue.payTo({ txId: tx.id })
    expect(await getQueueResult(queue.q, job.id)).toStrictEqual({ txId: tx.id })
    const ret = await queue.paymentService.baseFindById(tx.id)
    expect(ret.state).toBe(TRANSACTION_STATE.succeeded)
    const blockchainTx = await queue.paymentService.baseFindById(
      tx.providerTxId,
      'blockchain_transaction'
    )
    expect(blockchainTx.state).toBe(BLOCKCHAIN_TRANSACTION_STATE.succeeded)
  })
})

// describe.only('payToByBlockchainQueue.syncCurationEvents', () => {
//   const queue = payToByBlockchainQueue
//   test('debug', async () => {
//     jest.setTimeout(100000)
//     await queue._handleSyncCurationEvents()
//   })
// })
