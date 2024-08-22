/* eslint @typescript-eslint/ban-ts-comment: 0 */
import type { Connections } from 'definitions'
import { v4 } from 'uuid'

import { Knex } from 'knex'

import {
  BLOCKCHAIN,
  BLOCKCHAIN_CHAINID,
  BLOCKCHAIN_SAFE_CONFIRMS,
  BLOCKCHAIN_TRANSACTION_STATE,
  PAYMENT_CURRENCY,
  PAYMENT_PROVIDER,
  TRANSACTION_PURPOSE,
  TRANSACTION_REMARK,
  TRANSACTION_STATE,
  TRANSACTION_TARGET_TYPE,
} from 'common/enums'
import { PaymentQueueJobDataError } from 'common/errors'
import { PaymentService } from 'connectors'
import { CurationContract } from 'connectors/blockchain'
import { PayToByBlockchainQueue } from 'connectors/queue'

import { genConnections, closeConnections } from '../../__test__/utils'
import { contract } from 'common/environment'

// setup mock

const mockFetchLogs = jest.fn()
const mockFetchTxReceipt = jest.fn()
const mockFetchBlockNumber = jest.fn()
jest.mock('connectors/blockchain', () => ({
  __esModule: true,
  CurationContract: jest.fn().mockImplementation(() => ({
    fetchTxReceipt: mockFetchTxReceipt,
    fetchLogs: mockFetchLogs,
    fetchBlockNumber: mockFetchBlockNumber,
    chainId,
    address: contract.Optimism.curationAddress,
  })),
}))

// setup connections

let connections: Connections
let paymentService: PaymentService

beforeAll(async () => {
  connections = await genConnections()
  paymentService = new PaymentService(connections)
}, 30000)

afterAll(async () => {
  await closeConnections(connections)
})

// test data
const zeroAdress = '0x0000000000000000000000000000000000000000'

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
const chainId = BLOCKCHAIN_CHAINID.Optimism

const invalidTxhash =
  '0x209375f2de9ee7c2eed5e24eb30d0196a416924cd956a194e7060f9dcb39515b'
const failedTxhash =
  '0xbad52ae6172aa85e1f883967215cbdc5e70ddc479c7ee22da3c23d06820ee29e'
const txHash =
  '0x649cf52a3c7b6ba16e1d52d4fc409c9ca1307329e691147990abe59c8c16215b'
const txHash1 =
  '0x649cf52a3c7b6ba16e1d52d4fc409c9ca1307329e691147990abe59c8c16215c'
const txHash2 =
  '0x649cf52a3c7b6ba16e1d52d4fc409c9ca1307329e691147990abe59c8c16215d'
const txHash3 =
  '0x649cf52a3c7b6ba16e1d52d4fc409c9ca1307329e691147990abe59c8c16215e'
const notMinedHash =
  '0x649cf52a3c7b6ba16e1d52d4fc409c9ca1307329e691147990abe59c8c16215f'

const invalidTxReceipt = {
  blockNumber: 1,
  from: '0x999999cf1046e68e36e1aa2e0e07105eddd1f08f',
  to: contract.Optimism.curationAddress,
  txHash: invalidTxhash,
  reverted: false,
  events: [],
}
const failedTxReceipt = {
  blockNumber: 1,
  from: '0x999999cf1046e68e36e1aa2e0e07105eddd1f08f',
  to: contract.Optimism.curationAddress,
  txHash: failedTxhash,
  reverted: true,
  events: [],
}
const validEvent = {
  curatorAddress: '0x999999cf1046e68e36e1aa2e0e07105eddd1f08f',
  creatorAddress: '0x999999cf1046e68e36e1aa2e0e07105eddd1f08e',
  uri: 'ipfs://someIpfsDataHash1',
  tokenAddress: contract.Optimism.tokenAddress,
  amount: (amount * 1e6).toString(),
}
const nativeTokenEvent = {
  curatorAddress: '0x999999cf1046e68e36e1aa2e0e07105eddd1f08f',
  creatorAddress: '0x999999cf1046e68e36e1aa2e0e07105eddd1f08e',
  uri: 'ipfs://someIpfsDataHash1',
  tokenAddress: null,
  amount: (amount * 1e18).toString(),
}
const txReceipt = {
  blockNumber: 1,
  from: '0x999999cf1046e68e36e1aa2e0e07105eddd1f08f',
  to: contract.Optimism.curationAddress,
  txHash,
  reverted: false,
  events: [validEvent],
}
const txReceipt1 = {
  blockNumber: 1,
  from: '0x999999cf1046e68e36e1aa2e0e07105eddd1f08f',
  to: contract.Optimism.curationAddress,
  txHash: txHash1,
  reverted: false,
  events: [validEvent],
}

// tests

describe('payToByBlockchainQueue.payTo', () => {
  let queue: PayToByBlockchainQueue
  beforeAll(async () => {
    queue = new PayToByBlockchainQueue(connections, { delay: 0, attempt: 1 })
    mockFetchTxReceipt.mockClear()
    mockFetchTxReceipt.mockImplementation(async (hash: string) => {
      if (hash === invalidTxhash) {
        return invalidTxReceipt
      } else if (hash === failedTxhash) {
        return failedTxReceipt
      } else if (hash === txHash) {
        return txReceipt
      } else if (hash === txHash1) {
        return txReceipt1
      } else {
        return null
      }
    })
  })
  // afterAll(() => {
  //  queue.clearDelayedJobs()
  // })

  test('job with wrong tx id will fail', async () => {
    const wrongTxId = '12345'
    const job = await queue.payTo({ txId: wrongTxId })
    await expect(job.finished()).rejects.toThrow(
      new PaymentQueueJobDataError('pay-to pending tx not found')
    )
    expect(await job.getState()).toBe('failed')
  }, 10000000)

  test('tx with wrong provier will fail', async () => {
    const tx = await paymentService.createTransaction({
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
    await expect(job.finished()).rejects.toThrow(
      new PaymentQueueJobDataError('wrong pay-to queue')
    )
    expect(await job.getState()).toBe('failed')
  })

  test('tx with wrong providerTxId will fail', async () => {
    const tx = await paymentService.createTransaction({
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
    await expect(job.finished()).rejects.toThrow(
      new PaymentQueueJobDataError('blockchain transaction not found')
    )
    expect(await job.getState()).toBe('failed')
  })

  test('not mined tx will fail and retry', async () => {
    const tx = await paymentService.findOrCreateTransactionByBlockchainTxHash({
      chainId,
      txHash: notMinedHash,
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
    await expect(job.finished()).rejects.toThrow(
      new PaymentQueueJobDataError('blockchain transaction not mined')
    )
    expect(await job.getState()).toBe('failed')
  })

  test('failed blockchain transation will mark transaction and blockchainTx as failed', async () => {
    const tx = await paymentService.findOrCreateTransactionByBlockchainTxHash({
      chainId,
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
    expect(await job.finished()).toStrictEqual({ txId: tx.id })
    const ret = await paymentService.baseFindById(tx.id)
    expect(ret.state).toBe(TRANSACTION_STATE.failed)
    const blockchainTx = await paymentService.baseFindById(
      tx.providerTxId,
      'blockchain_transaction'
    )
    expect(blockchainTx.state).toBe(BLOCKCHAIN_TRANSACTION_STATE.reverted)
  })

  test('succeeded invalid blockchain transaction will mark transaction as canceled', async () => {
    const tx = await paymentService.findOrCreateTransactionByBlockchainTxHash({
      chainId,
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
    expect(await job.finished()).toStrictEqual({ txId: tx.id })
    const ret = await paymentService.baseFindById(tx.id)
    expect(ret.state).toBe(TRANSACTION_STATE.canceled)
    expect(ret.remark).toBe(TRANSACTION_REMARK.INVALID)
    const blockchainTx = await paymentService.baseFindById(
      tx.providerTxId,
      'blockchain_transaction'
    )
    expect(blockchainTx.state).toBe(BLOCKCHAIN_TRANSACTION_STATE.succeeded)
  })

  test('succeeded valid blockchain transaction will mark transaction and blockchainTx as succeeded', async () => {
    const tx = await paymentService.findOrCreateTransactionByBlockchainTxHash({
      chainId,
      txHash,
      amount,
      state,
      purpose,
      currency,
      recipientId,
      senderId: '10',
      targetId,
      targetType,
    })
    const job = await queue.payTo({ txId: tx.id })
    expect(await job.finished()).toStrictEqual({ txId: tx.id })
    const ret = await paymentService.baseFindById(tx.id)
    expect(ret.state).toBe(TRANSACTION_STATE.succeeded)
    const blockchainTx = await paymentService.baseFindById(
      tx.providerTxId,
      'blockchain_transaction'
    )
    expect(blockchainTx.state).toBe(BLOCKCHAIN_TRANSACTION_STATE.succeeded)
  })

  test('settle pending tx with succeeded valid blockchain transaction will mark both as succeeded', async () => {
    // create pending tx
    const draftProviderTxId = v4()
    const tx = await paymentService.createTransaction({
      amount,
      state,
      purpose,
      currency,
      provider,
      providerTxId: draftProviderTxId,
      recipientId,
      senderId: '10',
      targetId,
      targetType,
    })

    // settle tx
    const tx1 = await paymentService.findOrCreateTransactionByBlockchainTxHash({
      chainId,
      txId: tx.id,
      txHash: txHash1,
      amount,
      state,
      purpose,
      currency,
      recipientId,
      senderId: '10',
      targetId,
      targetType,
    })
    expect(tx.id).toBe(tx1.id)
    expect(tx1.providerTxId).not.toBe(draftProviderTxId)
    const job = await queue.payTo({ txId: tx.id })
    expect(await job.finished()).toStrictEqual({ txId: tx.id })
    const ret = await paymentService.baseFindById(tx.id)
    expect(ret.state).toBe(TRANSACTION_STATE.succeeded)
    const blockchainTx = await paymentService.baseFindById(
      tx1.providerTxId,
      'blockchain_transaction'
    )
    expect(blockchainTx.state).toBe(BLOCKCHAIN_TRANSACTION_STATE.succeeded)
  })

  test('no matched sender address will mark transaction as anonymous', async () => {
    const knex = connections.knex
    const txTable = 'transaction'
    const blockchainTxTable = 'blockchain_transaction'
    const eventTable = 'blockchain_curation_event'
    await knex(eventTable).del()
    await knex(blockchainTxTable).del()
    await knex(txTable).del()

    const tx = await paymentService.findOrCreateTransactionByBlockchainTxHash({
      chainId,
      txHash,
      amount,
      state,
      purpose,
      currency,
      recipientId,
      senderId: '3', // user w/0 eth address
      targetId,
      targetType,
    })
    const job = await queue.payTo({ txId: tx.id })
    expect(await job.finished()).toStrictEqual({ txId: tx.id })
    const ret = await paymentService.baseFindById(tx.id)
    expect(ret.senderId).toBeNull()
    expect(ret.state).toBe(TRANSACTION_STATE.succeeded)
    const blockchainTx = await paymentService.baseFindById(
      tx.providerTxId,
      'blockchain_transaction'
    )
    expect(blockchainTx.state).toBe(BLOCKCHAIN_TRANSACTION_STATE.succeeded)
  })
})

describe('payToByBlockchainQueue._syncCurationEvents', () => {
  const latestBlockNum = BigInt(30000128)
  const safeBlockNum =
    latestBlockNum - BigInt(BLOCKCHAIN_SAFE_CONFIRMS[BLOCKCHAIN.Optimism])
  const txTable = 'transaction'
  const blockchainTxTable = 'blockchain_transaction'
  const eventTable = 'blockchain_curation_event'
  const syncRecordTable = 'blockchain_sync_record'
  let queue: PayToByBlockchainQueue
  let knex: Knex

  beforeAll(async () => {
    queue = new PayToByBlockchainQueue(connections, { delay: 1, attempt: 1 })
    knex = connections.knex
    mockFetchTxReceipt.mockImplementation(async (hash: string) => {
      if (hash === invalidTxhash) {
        return invalidTxReceipt
      } else if (hash === failedTxhash) {
        return failedTxReceipt
      } else if (hash === txHash) {
        return txReceipt
      } else {
        return null
      }
    })
    mockFetchLogs.mockImplementation(async () => [])
    mockFetchBlockNumber.mockReturnValue(Promise.resolve(latestBlockNum))
  })
  // afterAll(() => {
  //  queue.clearDelayedJobs()
  // })
  test('_handleSyncCurationEvents update sync record', async () => {
    expect(await knex(syncRecordTable).count()).toEqual([{ count: '0' }])
    // create record
    // @ts-ignore
    await queue._handleSyncCurationEvents('Optimism')
    expect(await knex(syncRecordTable).count()).toEqual([{ count: '1' }])
    const oldSavepoint = await knex(syncRecordTable).first()
    // update record
    // @ts-ignore
    await queue._handleSyncCurationEvents('Optimism')
    expect(await knex(syncRecordTable).count()).toEqual([{ count: '1' }])
    const newSavepoint = await knex(syncRecordTable).first()
    expect(new Date(newSavepoint.updatedAt).getTime()).toBeGreaterThan(
      new Date(oldSavepoint.updatedAt).getTime()
    )
  })
  test('fetch logs', async () => {
    const contractAddress = contract.Optimism.curationAddress
    const curation = new CurationContract(chainId, contractAddress)

    const oldSavepoint1 = BigInt(20000000)
    mockFetchLogs.mockClear()
    // @ts-ignore
    const [, newSavepoint1] = await queue.fetchCurationLogs(
      curation,
      oldSavepoint1
    )
    expect(mockFetchLogs).toHaveBeenCalledWith(
      oldSavepoint1 + BigInt(1),
      safeBlockNum
    )
    expect(newSavepoint1).toBe(safeBlockNum)

    mockFetchLogs.mockClear()
    // @ts-ignore
    const [logs1, newSavepoint3] = await queue.fetchCurationLogs(
      curation,
      safeBlockNum - BigInt(1)
    )
    expect(mockFetchLogs).not.toHaveBeenCalled()
    expect(logs1).toEqual([])
    expect(newSavepoint3).toBe(safeBlockNum - BigInt(1))

    mockFetchLogs.mockClear()
    // @ts-ignore
    const [logs2, newSavepoint4] = await queue.fetchCurationLogs(
      curation,
      safeBlockNum
    )
    expect(mockFetchLogs).not.toHaveBeenCalled()
    expect(logs2).toEqual([])
    expect(newSavepoint4).toBe(safeBlockNum)
  })
  test('handle empty logs', async () => {
    // @ts-ignore
    await queue._syncCurationEvents([], 'Optimism')
  })
  test('handle native token curation logs', async () => {
    const nativeTokenLog = {
      txHash: txHash2,
      address: contract.Optimism.curationAddress,
      blockNumber: 1,
      removed: false,
      event: nativeTokenEvent,
    }
    // @ts-ignore
    await queue._syncCurationEvents([nativeTokenLog], 'Optimism')
    expect(
      await knex(eventTable).where({ tokenAddress: null }).count()
    ).toEqual([{ count: '1' }])
  })
  test('removed logs will be ignored', async () => {
    await knex(eventTable).del()
    await knex(blockchainTxTable).del()
    await knex(txTable).del()
    const removedLog = {
      txHash,
      address: contract.Optimism.curationAddress,
      blockNumber: 1,
      removed: true,
      event: validEvent,
    }
    // @ts-ignore
    await queue._syncCurationEvents([removedLog], 'Optimism')
    expect(await knex(txTable).count()).toEqual([{ count: '0' }])
    expect(await knex(blockchainTxTable).count()).toEqual([{ count: '0' }])
    expect(await knex(eventTable).count()).toEqual([{ count: '0' }])
  })
  test('invalid logs will not update tx', async () => {
    await knex(eventTable).del()
    await knex(blockchainTxTable).del()
    await knex(txTable).del()
    const invalidLogs = [
      {
        txHash: 'fakeTxhash2',
        address: contract.Optimism.curationAddress,
        blockNumber: 2,
        removed: false,
        event: {
          ...validEvent,
          creatorAddress: zeroAdress,
        },
      },
      {
        txHash: 'fakeTxhash3',
        address: contract.Optimism.curationAddress,
        blockNumber: 3,
        removed: false,
        event: {
          ...validEvent,
          uri: 'invalidSchema',
        },
      },
      {
        txHash: 'fakeTxhash4',
        address: contract.Optimism.curationAddress,
        blockNumber: 4,
        removed: false,
        event: {
          ...validEvent,
          uri: 'ipfs://notInMatters',
        },
      },
    ]
    // @ts-ignore
    await queue._syncCurationEvents(invalidLogs, 'Optimism')
    expect(await knex(txTable).count()).toEqual([{ count: '0' }])
    expect(await knex(blockchainTxTable).count()).toEqual([{ count: '3' }])
    expect(await knex(eventTable).count()).toEqual([{ count: '3' }])
  })
  test('valid logs will update tx', async () => {
    const logs = [
      {
        txHash,
        address: contract.Optimism.curationAddress,
        blockNumber: 1,
        removed: false,
        event: {
          ...validEvent,
        },
      },
    ]

    // match a pending tx, update to succeeded
    await knex(eventTable).del()
    await knex(blockchainTxTable).del()
    await knex(txTable).del()
    await paymentService.createTransaction({
      amount,
      state: TRANSACTION_STATE.pending,
      purpose,
      currency,
      provider,
      providerTxId: v4(),
      recipientId,
      senderId: '10',
      targetId,
      targetType,
    })
    // @ts-ignore
    await queue._syncCurationEvents(logs, 'Optimism')
    const updatedTx = await knex(txTable).first()
    const updatedBlockchainTx = await knex(blockchainTxTable).first()
    expect(updatedTx.state).toBe(TRANSACTION_STATE.succeeded)
    expect(updatedBlockchainTx.state).toBe(
      BLOCKCHAIN_TRANSACTION_STATE.succeeded
    )
    expect(updatedBlockchainTx.transactionId).toBe(updatedTx.id)
    expect(updatedTx.providerTxId).toBe(updatedBlockchainTx.id)

    // no related tx, create a anonymous tx
    await knex(eventTable).del()
    await knex(blockchainTxTable).del()
    await knex(txTable).del()
    // @ts-ignore
    await queue._syncCurationEvents(logs, 'Optimism')
    expect(await knex(txTable).count()).toEqual([{ count: '1' }])
    const tx = await knex(txTable).first()
    const blockchainTx = await knex(blockchainTxTable).first()
    expect(tx.state).toBe(TRANSACTION_STATE.succeeded)
    expect(blockchainTx.transactionId).toBe(tx.id)
    expect(tx.senderId).toBeNull()

    // related tx state is not succeeded, update to succeeded
    await knex(eventTable).del()
    await knex(blockchainTxTable).update({
      state: BLOCKCHAIN_TRANSACTION_STATE.pending,
    })
    await knex(txTable).update({ state: TRANSACTION_STATE.pending })
    // @ts-ignore
    await queue._syncCurationEvents(logs, 'Optimism')
    expect(await knex(txTable).count()).toEqual([{ count: '1' }])
    const updatedTx1 = await knex(txTable).where('id', tx.id).first()
    const updatedBlockchainTx1 = await knex(blockchainTxTable)
      .where('id', blockchainTx.id)
      .first()

    expect(updatedTx1.state).toBe(TRANSACTION_STATE.succeeded)
    expect(updatedBlockchainTx1.state).toBe(
      BLOCKCHAIN_TRANSACTION_STATE.succeeded
    )

    // related tx sender/recipient is invalid, won't be corrected
    await knex(eventTable).del()
    await knex(txTable).update({ senderId: '3' })
    await knex(txTable).update({ recipientId: '4' })
    await knex(txTable).update({ state: TRANSACTION_STATE.pending })
    await knex(blockchainTxTable).update({
      state: BLOCKCHAIN_TRANSACTION_STATE.pending,
    })
    // @ts-ignore
    await queue._syncCurationEvents(logs, 'Optimism')
    expect(await knex(txTable).count()).toEqual([{ count: '1' }])
    const updatedTx2 = await knex(txTable).where('id', tx.id).first()
    const updatedBlockchainTx2 = await knex(blockchainTxTable)
      .where('id', blockchainTx.id)
      .first()
    expect(updatedTx2.senderId).toBe('3')
    expect(updatedTx2.recipientId).toBe('4')
    expect(updatedTx2.state).toBe(TRANSACTION_STATE.succeeded)
    expect(updatedBlockchainTx2.state).toBe(
      BLOCKCHAIN_TRANSACTION_STATE.succeeded
    )
  })

  test.skip('blockchain_transaction forgeting adding transaction_id will be update and not send notification', async () => {
    // mock notify failed below as we have no direct access to paymentService in queue now
    const mockNotify = jest.fn()
    // @ts-ignore
    paymentService.notifyDonation = mockNotify

    expect(mockNotify).not.toHaveBeenCalled()

    const tx = await paymentService.findOrCreateTransactionByBlockchainTxHash({
      chainId,
      txHash: txHash3,
      amount,
      state,
      purpose,
      currency,
      recipientId,
      senderId,
      targetId,
      targetType,
    })
    const blockchainTx = await paymentService.findOrCreateBlockchainTransaction(
      {
        chainId,
        txHash: txHash3,
      }
    )
    expect(blockchainTx.transactionId).toBe(tx.id)
    await knex(blockchainTxTable)
      .where({ id: blockchainTx.id })
      .update({ transactionId: null })
    const updated = await paymentService.findOrCreateBlockchainTransaction({
      chainId,
      txHash: txHash3,
    })
    expect(updated.transactionId).toBe(null)

    const logs = [
      {
        txHash: txHash3,
        address: contract.Optimism.curationAddress,
        blockNumber: 1,
        removed: false,
        event: {
          ...validEvent,
        },
      },
    ]
    // @ts-ignore
    await queue._syncCurationEvents(logs, 'Optimism')

    const updatedBlockchainTx =
      await paymentService.findOrCreateBlockchainTransaction({
        chainId,
        txHash: txHash3,
      })
    expect(updatedBlockchainTx.transactionId).toBe(tx.id)
    expect(updatedBlockchainTx.state).toBe(
      BLOCKCHAIN_TRANSACTION_STATE.succeeded
    )
    const updatedTx = await knex(txTable).where('id', tx.id).first()
    expect(updatedTx.state).toBe(TRANSACTION_STATE.succeeded)

    expect(mockNotify).toHaveBeenCalled()

    // succeeded broken blockchainTx should not notify
    await knex(blockchainTxTable)
      .where({ id: blockchainTx.id })
      .update({ transactionId: null })
    await knex(eventTable).del()
    mockNotify.mockClear()
    expect(mockNotify).not.toHaveBeenCalled()

    // @ts-ignore
    await queue._syncCurationEvents(logs, 'Optimism')

    expect(mockNotify).not.toHaveBeenCalled()
  })
})
