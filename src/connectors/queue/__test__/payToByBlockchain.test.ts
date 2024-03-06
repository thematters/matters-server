/* eslint @typescript-eslint/ban-ts-comment: 0 */
import type { Connections } from 'definitions'

import { Knex } from 'knex'

import {
  BLOCKCHAIN,
  BLOCKCHAIN_CHAINID,
  BLOCKCHAIN_TRANSACTION_STATE,
  PAYMENT_CURRENCY,
  PAYMENT_PROVIDER,
  TRANSACTION_PURPOSE,
  TRANSACTION_REMARK,
  TRANSACTION_STATE,
  TRANSACTION_TARGET_TYPE,
} from 'common/enums'
import { environment, polygonUSDTContractAddress } from 'common/environment'
import { PaymentQueueJobDataError, UnknownError } from 'common/errors'
import { PaymentService } from 'connectors'
import { CurationContract } from 'connectors/blockchain'
import { PayToByBlockchainQueue } from 'connectors/queue'
import { GQLChain } from 'definitions'

import { genConnections, closeConnections } from '../../__test__/utils'

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
    chainId: BLOCKCHAIN_CHAINID.Polygon.PolygonMumbai,
    address: environment.polygonCurationContractAddress.toLowerCase(),
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

const polygonCurationContractAddress =
  environment.polygonCurationContractAddress.toLowerCase()
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
const chain = BLOCKCHAIN.Polygon.valueOf() as GQLChain

const invalidTxhash =
  '0x209375f2de9ee7c2eed5e24eb30d0196a416924cd956a194e7060f9dcb39515b'
const failedTxhash =
  '0xbad52ae6172aa85e1f883967215cbdc5e70ddc479c7ee22da3c23d06820ee29e'
const txHash =
  '0x649cf52a3c7b6ba16e1d52d4fc409c9ca1307329e691147990abe59c8c16215c'
const txHash2 =
  '0x649cf52a3c7b6ba16e1d52d4fc409c9ca1307329e691147990abe59c8c16215d'
const txHash3 =
  '0x649cf52a3c7b6ba16e1d52d4fc409c9ca1307329e691147990abe59c8c16215e'
const notMinedHash =
  '0x649cf52a3c7b6ba16e1d52d4fc409c9ca1307329e691147990abe59c8c16215f'

const invalidTxReceipt = {
  txHash: invalidTxhash,
  reverted: false,
  events: [],
}
const failedTxReceipt = {
  txHash: failedTxhash,
  reverted: true,
  events: [],
}
const validEvent = {
  curatorAddress: '0x999999cf1046e68e36e1aa2e0e07105eddd1f08f',
  creatorAddress: '0x999999cf1046e68e36e1aa2e0e07105eddd1f08e',
  uri: 'ipfs://someIpfsDataHash1',
  tokenAddress: polygonUSDTContractAddress,
  amount: '1000000000000000000',
}
const nativeTokenEvent = {
  curatorAddress: '0x999999cf1046e68e36e1aa2e0e07105eddd1f08f',
  creatorAddress: '0x999999cf1046e68e36e1aa2e0e07105eddd1f08e',
  uri: 'ipfs://someIpfsDataHash1',
  tokenAddress: null,
  amount: '1000000000000000000',
}
const txReceipt = {
  txHash,
  reverted: false,
  events: [validEvent],
}

// tests

describe('payToByBlockchainQueue.payTo', () => {
  let queue: PayToByBlockchainQueue
  beforeAll(async () => {
    queue = new PayToByBlockchainQueue(connections, 1)
    mockFetchTxReceipt.mockClear()
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
  })

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
      chain,
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
      chain,
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
})

describe('payToByBlockchainQueue.syncCurationEvents', () => {
  const latestBlockNum = BigInt(30000128)
  const safeBlockNum = BigInt(30000000)
  const txTable = 'transaction'
  const blockchainTxTable = 'blockchain_transaction'
  const eventTable = 'blockchain_curation_event'
  const syncRecordTable = 'blockchain_sync_record'
  let queue: PayToByBlockchainQueue
  let knex: Knex

  beforeAll(async () => {
    queue = new PayToByBlockchainQueue(connections)
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
    await queue._handleSyncCurationEvents()
    expect(await knex(syncRecordTable).count()).toEqual([{ count: '1' }])
    // update record
    // @ts-ignore
    await queue._handleSyncCurationEvents()
    expect(await knex(syncRecordTable).count()).toEqual([{ count: '1' }])
  })
  test('fetch logs', async () => {
    const curation = new CurationContract()

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
    await queue.syncCurationEvents([])
  })
  test('handle native token curation logs', async () => {
    const nativeTokenLog = {
      txHash: txHash2,
      address: polygonCurationContractAddress,
      blockNumber: 1,
      removed: false,
      event: nativeTokenEvent,
    }
    // @ts-ignore
    await queue.syncCurationEvents([nativeTokenLog])
    expect(
      await knex(eventTable).where({ tokenAddress: null }).count()
    ).toEqual([{ count: '1' }])
  })
  test('removed logs will throw error', async () => {
    const removedLog = {
      txHash,
      address: polygonCurationContractAddress,
      blockNumber: 1,
      removed: true,
      event: validEvent,
    }
    // @ts-ignore
    await expect(queue.syncCurationEvents([removedLog])).rejects.toThrow(
      new UnknownError('unexpected removed logs')
    )
  })
  test('not matters logs will not update tx', async () => {
    await knex(eventTable).del()
    await knex(blockchainTxTable).del()
    await knex(txTable).del()
    const notMattersLogs = [
      {
        txHash: 'fakeTxhash1',
        address: polygonCurationContractAddress,
        blockNumber: 1,
        removed: false,
        event: {
          ...validEvent,
          curatorAddress: zeroAdress,
        },
      },
      {
        txHash: 'fakeTxhash2',
        address: polygonCurationContractAddress,
        blockNumber: 2,
        removed: false,
        event: {
          ...validEvent,
          creatorAddress: zeroAdress,
        },
      },
      {
        txHash: 'fakeTxhash3',
        address: polygonCurationContractAddress,
        blockNumber: 3,
        removed: false,
        event: {
          ...validEvent,
          uri: 'invalidSchema',
        },
      },
      {
        txHash: 'fakeTxhash4',
        address: polygonCurationContractAddress,
        blockNumber: 4,
        removed: false,
        event: {
          ...validEvent,
          uri: 'ipfs://notInMatters',
        },
      },
    ]
    // @ts-ignore
    await queue.syncCurationEvents(notMattersLogs)
    expect(await knex(txTable).count()).toEqual([{ count: '0' }])
    expect(await knex(blockchainTxTable).count()).toEqual([{ count: '4' }])
    expect(await knex(eventTable).count()).toEqual([{ count: '4' }])
  })
  test('matters logs will update tx', async () => {
    await knex(eventTable).del()
    await knex(blockchainTxTable).del()
    await knex(txTable).del()

    // no related tx, insert one
    const logs = [
      {
        txHash,
        address: polygonCurationContractAddress,
        blockNumber: 1,
        removed: false,
        event: {
          ...validEvent,
        },
      },
    ]
    // @ts-ignore
    await queue.syncCurationEvents(logs)
    expect(await knex(txTable).count()).toEqual([{ count: '1' }])
    const tx = await knex(txTable).first()
    const blockchainTx = await knex(blockchainTxTable).first()
    expect(tx.state).toBe(TRANSACTION_STATE.succeeded)
    expect(blockchainTx.transactionId).toBe(tx.id)

    // related tx state is not succeeded, update to succeeded
    await knex(eventTable).del()
    await knex(blockchainTxTable).update({
      state: BLOCKCHAIN_TRANSACTION_STATE.pending,
    })
    await knex(txTable).update({ state: TRANSACTION_STATE.pending })

    // @ts-ignore
    await queue.syncCurationEvents(logs)
    expect(await knex(txTable).count()).toEqual([{ count: '1' }])
    const updatedTx = await knex(txTable).where('id', tx.id).first()
    const updatedBlockchainTx = await knex(blockchainTxTable)
      .where('id', blockchainTx.id)
      .first()

    expect(updatedTx.state).toBe(TRANSACTION_STATE.succeeded)
    expect(updatedBlockchainTx.state).toBe(
      BLOCKCHAIN_TRANSACTION_STATE.succeeded
    )

    // related tx is invalid, correct it and update to succeeded
    await knex(eventTable).del()
    await knex(txTable).update({ recipientId: '3' })
    await knex(txTable).update({ state: TRANSACTION_STATE.pending })
    await knex(blockchainTxTable).update({
      state: BLOCKCHAIN_TRANSACTION_STATE.pending,
    })

    // @ts-ignore
    await queue.syncCurationEvents(logs)
    expect(await knex(txTable).count()).toEqual([{ count: '1' }])
    const updatedTx2 = await knex(txTable).where('id', tx.id).first()
    const updatedBlockchainTx2 = await knex(blockchainTxTable)
      .where('id', blockchainTx.id)
      .first()
    expect(updatedTx2.recipientId).toBe(tx.recipientId)
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
      chain,
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
        chain,
        txHash: txHash3,
      }
    )
    expect(blockchainTx.transactionId).toBe(tx.id)
    await knex(blockchainTxTable)
      .where({ id: blockchainTx.id })
      .update({ transactionId: null })
    const updated = await paymentService.findOrCreateBlockchainTransaction({
      chain,
      txHash: txHash3,
    })
    expect(updated.transactionId).toBe(null)

    const logs = [
      {
        txHash: txHash3,
        address: polygonCurationContractAddress,
        blockNumber: 1,
        removed: false,
        event: {
          ...validEvent,
        },
      },
    ]
    // @ts-ignore
    await queue.syncCurationEvents(logs)

    const updatedBlockchainTx =
      await paymentService.findOrCreateBlockchainTransaction({
        chain,
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
    await queue.syncCurationEvents(logs)

    expect(mockNotify).not.toHaveBeenCalled()
  })
})
