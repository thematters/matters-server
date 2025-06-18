import type { Connections } from '#definitions/index.js'

import {
  BLOCKCHAIN_CHAINID,
  BLOCKCHAIN_TRANSACTION_STATE,
  PAYMENT_CURRENCY,
  PAYMENT_PROVIDER,
  TRANSACTION_PURPOSE,
  TRANSACTION_STATE,
  TRANSACTION_TARGET_TYPE,
  TRANSACTION_REMARK,
} from '#common/enums/index.js'
import { contract } from '#common/environment.js'
import { PaymentService, AtomService } from '#connectors/index.js'

import { jest } from '@jest/globals'

import { genConnections, closeConnections } from '../utils.js'

let connections: Connections
let paymentService: PaymentService
let atomService: AtomService

beforeAll(async () => {
  connections = await genConnections()
  paymentService = new PaymentService(connections)
  atomService = new AtomService(connections)
}, 30000)

afterAll(async () => {
  await closeConnections(connections)
})

// test data and helpers
const amount = 1
const state = TRANSACTION_STATE.pending
const purpose = TRANSACTION_PURPOSE.donation
const currency = PAYMENT_CURRENCY.USDT
const provider = PAYMENT_PROVIDER.blockchain
const recipientId = '1'
const recipientEthAddress =
  '0x999999cf1046e68e36e1aa2e0e07105eddd1f08e' as `0x${string}`
const senderId = '2'
// from seed/01_users.js
const senderEthAddress =
  '0x999999cf1046e68e36e1aa2e0e07105eddd1f08g' as `0x${string}`
const targetId = '1'
const targetType = TRANSACTION_TARGET_TYPE.article
const chainId = BLOCKCHAIN_CHAINID.Optimism

const invalidTxhash =
  '0x209375f2de9ee7c2eed5e24eb30d0196a416924cd956a194e7060f9dcb39515b' as `0x${string}`
const failedTxhash =
  '0xbad52ae6172aa85e1f883967215cbdc5e70ddc479c7ee22da3c23d06820ee29e' as `0x${string}`
const txHash =
  '0x649cf52a3c7b6ba16e1d52d4fc409c9ca1307329e691147990abe59c8c16215b' as `0x${string}`
const notMinedHash =
  '0x649cf52a3c7b6ba16e1d52d4fc409c9ca1307329e691147990abe59c8c16215f' as `0x${string}`
const txHash1 =
  '0x649cf52a3c7b6ba16e1d52d4fc409c9ca1307329e691147990abe59c8c16200c' as `0x${string}`
const txHash2 =
  '0x649cf52a3c7b6ba16e1d52d4fc409c9ca1307329e691147990abe59c8c16200d' as `0x${string}`
const txHash3 =
  '0x649cf52a3c7b6ba16e1d52d4fc409c9ca1307329e691147990abe59c8c16200e' as `0x${string}`

const fetchTxReceipt = async (hash: string) => {
  const invalidTxReceipt = {
    blockNumber: 1,
    from: senderEthAddress,
    to: contract.Optimism.curationAddress as `0x${string}`,
    txHash: invalidTxhash,
    reverted: false,
    events: [],
  }
  const failedTxReceipt = {
    blockNumber: 1,
    from: senderEthAddress,
    to: contract.Optimism.curationAddress as `0x${string}`,
    txHash: failedTxhash,
    reverted: true,
    events: [],
  }
  const validEvent = {
    curatorAddress: senderEthAddress,
    creatorAddress: recipientEthAddress,
    uri: 'ipfs://someIpfsDataHash1',
    tokenAddress: contract.Optimism.tokenAddress as `0x${string}`,
    amount: (amount * 1e6).toString(),
  }
  const txReceipt = {
    blockNumber: 1,
    from: senderEthAddress as `0x${string}`,
    to: contract.Optimism.curationAddress as `0x${string}`,
    txHash,
    reverted: false,
    events: [validEvent],
  }
  if (hash === invalidTxhash) {
    return invalidTxReceipt
  } else if (hash === failedTxhash) {
    return failedTxReceipt
  } else if (hash === txHash) {
    return txReceipt
  } else if (hash === notMinedHash) {
    return null
  } else {
    return {
      blockNumber: 1,
      from: senderEthAddress as `0x${string}`,
      to: contract.Optimism.curationAddress as `0x${string}`,
      txHash: hash,
      reverted: false,
      events: [validEvent],
    }
  }
}

// const nativeTokenEvent = {
//   curatorAddress: '0x999999cf1046e68e36e1aa2e0e07105eddd1f08f',
//   creatorAddress: '0x999999cf1046e68e36e1aa2e0e07105eddd1f08e',
//   uri: 'ipfs://someIpfsDataHash1',
//   tokenAddress: null,
//   amount: (amount * 1e18).toString(),
// }
// const vaultTokenEvent = {
//   curatorAddress: '0x999999cf1046e68e36e1aa2e0e07105eddd1f08f',
//   creatorId: recipientId,
//   uri: 'ipfs://someIpfsDataHash1',
//   tokenAddress: contract.Optimism.tokenAddress,
//   amount: (amount * 1e6).toString(),
// }

describe('payToBlockchain', () => {
  describe('error cases', () => {
    test('should throw error when transaction not found', async () => {
      const nonExistentTxId = '0'

      await expect(
        paymentService.payToBlockchain({ txId: nonExistentTxId })
      ).rejects.toThrow()
    })

    test('should throw error when blockchain transaction not found', async () => {
      const tx = await paymentService.createTransaction({
        amount,
        state,
        purpose,
        currency,
        provider,
        providerTxId: '0',
        recipientId,
        senderId,
        targetId,
        targetType,
      })

      await expect(
        paymentService.payToBlockchain({ txId: tx.id }, fetchTxReceipt)
      ).rejects.toThrow()
    })

    test('should throw error when transaction not mined', async () => {
      const blockchainTx =
        await paymentService.findOrCreateBlockchainTransaction({
          chainId,
          txHash: notMinedHash,
        })

      const tx = await paymentService.createTransaction({
        amount,
        state,
        purpose,
        currency,
        provider,
        providerTxId: blockchainTx.id,
        recipientId,
        senderId,
        targetId,
        targetType,
      })

      await expect(
        paymentService.payToBlockchain({ txId: tx.id }, fetchTxReceipt)
      ).rejects.toThrow()
    })

    test('should throw error when article not found', async () => {
      const blockchainTx =
        await paymentService.findOrCreateBlockchainTransaction({
          chainId,
          txHash,
        })

      const tx = await paymentService.createTransaction({
        amount,
        state,
        purpose,
        currency,
        provider,
        providerTxId: blockchainTx.id,
        recipientId,
        senderId,
        targetId: '0',
        targetType,
      })

      await expect(
        paymentService.payToBlockchain({ txId: tx.id }, fetchTxReceipt)
      ).rejects.toThrow()
    })
  })

  describe('transaction state updates', () => {
    test('should mark transaction as failed when blockchain tx is reverted', async () => {
      const blockchainTx =
        await paymentService.findOrCreateBlockchainTransaction({
          chainId,
          txHash: failedTxhash,
        })

      const tx = await paymentService.createTransaction({
        amount,
        state,
        purpose,
        currency,
        provider,
        providerTxId: blockchainTx.id,
        recipientId,
        senderId,
        targetId,
        targetType,
      })

      const result = await paymentService.payToBlockchain(
        { txId: tx.id },
        fetchTxReceipt
      )

      expect(result.txId).toBe(tx.id)

      // Check that transaction was marked as failed
      const updatedTx = await atomService.findUnique({
        table: 'transaction',
        where: { id: tx.id },
      })
      expect(updatedTx?.state).toBe(TRANSACTION_STATE.failed)

      // Check that blockchain transaction was marked as reverted
      const updatedBlockchainTx = await atomService.findUnique({
        table: 'blockchain_transaction',
        where: { id: blockchainTx.id },
      })
      expect(updatedBlockchainTx?.state).toBe(
        BLOCKCHAIN_TRANSACTION_STATE.reverted
      )
    })

    test('should cancel transaction when events do not match', async () => {
      const blockchainTx =
        await paymentService.findOrCreateBlockchainTransaction({
          chainId,
          txHash: invalidTxhash, // this receipt has no events
        })

      const tx = await paymentService.createTransaction({
        amount,
        state,
        purpose,
        currency,
        provider,
        providerTxId: blockchainTx.id,
        recipientId,
        senderId,
        targetId,
        targetType,
      })

      const result = await paymentService.payToBlockchain(
        { txId: tx.id },
        fetchTxReceipt
      )

      expect(result.txId).toBe(tx.id)

      // Check that transaction was marked as canceled with invalid remark
      const updatedTx = await atomService.findUnique({
        table: 'transaction',
        where: { id: tx.id },
      })
      expect(updatedTx?.state).toBe(TRANSACTION_STATE.canceled)
      expect(updatedTx?.remark).toBe(TRANSACTION_REMARK.INVALID)

      // Check that blockchain transaction was marked as succeeded
      const updatedBlockchainTx = await atomService.findUnique({
        table: 'blockchain_transaction',
        where: { id: blockchainTx.id },
      })
      expect(updatedBlockchainTx?.state).toBe(
        BLOCKCHAIN_TRANSACTION_STATE.succeeded
      )
    })
  })

  describe('successful transactions', () => {
    test('should succeed transaction with matched sender', async () => {
      const blockchainTx =
        await paymentService.findOrCreateBlockchainTransaction({
          chainId,
          txHash: txHash1,
        })

      const tx = await paymentService.createTransaction({
        amount,
        state,
        purpose,
        currency,
        provider,
        providerTxId: blockchainTx.id,
        recipientId,
        senderId,
        targetId,
        targetType,
      })

      // Mock notification service to avoid email sending
      const notifyDonationSpy = jest
        .spyOn(paymentService, 'notifyDonation')
        .mockResolvedValue()

      const result = await paymentService.payToBlockchain(
        { txId: tx.id },
        fetchTxReceipt
      )

      expect(result.txId).toBe(tx.id)

      // Check that transaction was marked as succeeded
      const updatedTx = await atomService.findUnique({
        table: 'transaction',
        where: { id: tx.id },
      })
      expect(updatedTx?.state).toBe(TRANSACTION_STATE.succeeded)
      expect(updatedTx?.senderId).toBe(senderId) // sender should remain

      // Check that blockchain transaction was marked as succeeded
      const updatedBlockchainTx = await atomService.findUnique({
        table: 'blockchain_transaction',
        where: { id: blockchainTx.id },
      })
      expect(updatedBlockchainTx?.state).toBe(
        BLOCKCHAIN_TRANSACTION_STATE.succeeded
      )
      expect(updatedBlockchainTx?.from).toBe(senderEthAddress)
      expect(updatedBlockchainTx?.to).toBe(contract.Optimism.curationAddress)
      expect(updatedBlockchainTx?.blockNumber).toBe('1')

      // Check that notification was called with sender
      expect(notifyDonationSpy).toHaveBeenCalledWith({
        tx: expect.objectContaining({ id: tx.id }),
        sender: expect.objectContaining({ id: senderId }),
        recipient: expect.objectContaining({ id: recipientId }),
        article: expect.objectContaining({ id: targetId }),
      })

      notifyDonationSpy.mockRestore()
    })

    test('should anonymize transaction when sender ETH address does not match', async () => {
      // Update sender with different ETH address
      await atomService.update({
        table: 'user',
        where: { id: senderId },
        data: {
          ethAddress: '0x1111111111111111111111111111111111111111', // different address
        },
      })

      const blockchainTx =
        await paymentService.findOrCreateBlockchainTransaction({
          chainId,
          txHash: txHash2,
        })

      const tx = await paymentService.createTransaction({
        amount,
        state,
        purpose,
        currency,
        provider,
        providerTxId: blockchainTx.id,
        recipientId,
        senderId,
        targetId,
        targetType,
      })

      // Mock notification service
      const notifyDonationSpy = jest
        .spyOn(paymentService, 'notifyDonation')
        .mockResolvedValue()

      const result = await paymentService.payToBlockchain(
        { txId: tx.id },
        fetchTxReceipt
      )

      expect(result.txId).toBe(tx.id)

      // Check that transaction was marked as succeeded but sender was anonymized
      const updatedTx = await atomService.findUnique({
        table: 'transaction',
        where: { id: tx.id },
      })
      expect(updatedTx?.state).toBe(TRANSACTION_STATE.succeeded)
      expect(updatedTx?.senderId).toBeNull() // sender should be anonymized

      // Check that notification was called without sender
      expect(notifyDonationSpy).toHaveBeenCalledWith({
        tx: expect.objectContaining({ id: tx.id }),
        sender: undefined,
        recipient: expect.objectContaining({ id: recipientId }),
        article: expect.objectContaining({ id: targetId }),
      })

      notifyDonationSpy.mockRestore()
    })

    test('should handle recipient without ETH address (vault curation)', async () => {
      // Remove recipient ETH address to simulate vault curation
      await atomService.update({
        table: 'user',
        where: { id: recipientId },
        data: {
          ethAddress: null,
        },
      })

      const blockchainTx =
        await paymentService.findOrCreateBlockchainTransaction({
          chainId,
          txHash: txHash3,
        })

      const tx = await paymentService.createTransaction({
        amount,
        state,
        purpose,
        currency,
        provider,
        providerTxId: blockchainTx.id,
        recipientId,
        senderId,
        targetId,
        targetType,
      })

      // Mock notification service
      const notifyDonationSpy = jest
        .spyOn(paymentService, 'notifyDonation')
        .mockResolvedValue()

      const result = await paymentService.payToBlockchain(
        { txId: tx.id },
        fetchTxReceipt
      )

      expect(result.txId).toBe(tx.id)

      // Check that transaction was processed successfully
      const updatedTx = await atomService.findUnique({
        table: 'transaction',
        where: { id: tx.id },
      })
      expect(updatedTx?.state).toBe(TRANSACTION_STATE.succeeded)

      expect(notifyDonationSpy).toHaveBeenCalled()
      notifyDonationSpy.mockRestore()
    })
  })
})
