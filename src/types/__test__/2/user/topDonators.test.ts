import type { Connections } from '#definitions/index.js'

import {
  BLOCKCHAIN_TRANSACTION_STATE,
  TRANSACTION_STATE,
  TRANSACTION_PURPOSE,
  PAYMENT_CURRENCY,
  PAYMENT_PROVIDER,
  TRANSACTION_TARGET_TYPE,
} from '#common/enums/index.js'
import { PaymentService } from '#connectors/index.js'
import { createDonationTx } from '#connectors/__test__/utils.js'

import { testClient, genConnections, closeConnections } from '../../utils.js'

let connections: Connections
let paymentService: PaymentService

beforeAll(async () => {
  connections = await genConnections()
  paymentService = new PaymentService(connections)
}, 50000)

afterAll(async () => {
  await closeConnections(connections)
})

const GET_VIEWER_TOPDONATORS = /* GraphQL */ `
  query ($input: TopDonatorInput!) {
    viewer {
      analytics {
        topDonators(input: $input) {
          edges {
            node {
              ... on User {
                userName
              }
              ... on CryptoWallet {
                address
              }
            }
            donationCount
          }
          totalCount
        }
      }
    }
  }
`

const createBlockchainDonationTx = async (
  {
    recipientId,
    fromAddress,
    toAddress,
    targetId,
    amount,
    txHash,
    chainId,
    currency,
    provider,
    state,
  }: {
    recipientId: string
    fromAddress: string
    toAddress?: string
    targetId?: string
    amount?: number
    txHash?: string
    chainId?: number
    currency?: keyof typeof PAYMENT_CURRENCY
    provider?: PAYMENT_PROVIDER
    state?: BLOCKCHAIN_TRANSACTION_STATE
  },
  paymentService: PaymentService
) => {
  // Create a transaction without sender_id (null sender for blockchain tx)
  const transaction = await paymentService.createTransaction({
    amount: amount ?? 100,
    fee: 0,
    purpose: TRANSACTION_PURPOSE.donation,
    currency: currency ?? PAYMENT_CURRENCY.USDT,
    state: TRANSACTION_STATE.succeeded,
    provider: provider ?? PAYMENT_PROVIDER.matters,
    providerTxId: txHash ?? `tx_${Math.random()}`,
    recipientId,
    senderId: undefined, // No user sender for blockchain transactions
    targetId: targetId ?? '1',
    targetType: TRANSACTION_TARGET_TYPE.article,
  })

  // Create the blockchain transaction record
  await connections.knex('blockchain_transaction').insert({
    transaction_id: transaction.id,
    chain_id: chainId ?? 1,
    tx_hash: txHash ?? `0x${Math.random().toString(16).slice(2)}`,
    state: state ?? BLOCKCHAIN_TRANSACTION_STATE.succeeded,
    from: fromAddress,
    to: toAddress ?? '0x0000000000000000000000000000000000000000',
    block_number: Math.floor(Math.random() * 1000000),
  })

  return transaction
}

describe('user query fields', () => {
  beforeEach(async () => {
    // Clean up donations for recipient '1' before each test
    await connections
      .knex('blockchain_transaction')
      .whereIn('transaction_id', function () {
        this.select('id').from('transaction').where({ recipientId: '1' })
      })
      .del()
    await connections.knex('transaction').where({ recipientId: '1' }).del()
  })

  test('retrive topDonators by visitor', async () => {
    const server = await testClient({ connections })
    const { data, errors } = await server.executeOperation({
      query: GET_VIEWER_TOPDONATORS,
      variables: { input: {} },
    })
    expect(errors).toBeUndefined()
    const donators = data.viewer.analytics.topDonators
    expect(donators).toEqual({ edges: [], totalCount: 0 })
  })

  test('retrive topDonators by user', async () => {
    const server = await testClient({
      isAuth: true,
      connections,
    })
    const recipientId = '1'
    // test no donators
    const res1 = await server.executeOperation({
      query: GET_VIEWER_TOPDONATORS,
      variables: { input: {} },
    })
    const donators1 = res1.data?.viewer?.analytics?.topDonators
    expect(donators1).toEqual({ edges: [], totalCount: 0 })

    // test having donators
    await createDonationTx({ recipientId, senderId: '2' }, paymentService)
    const res2 = await server.executeOperation({
      query: GET_VIEWER_TOPDONATORS,
      variables: { input: {} },
    })
    const donators2 = res2.data?.viewer?.analytics?.topDonators
    expect(donators2).toEqual({
      edges: [{ node: { userName: 'test2' }, donationCount: 1 }],
      totalCount: 1,
    })

    // test pagination
    await createDonationTx({ recipientId, senderId: '3' }, paymentService)
    const res3 = await server.executeOperation({
      query: GET_VIEWER_TOPDONATORS,
      variables: { input: { first: 1 } },
    })
    const donators3 = res3.data?.viewer?.analytics?.topDonators
    expect(donators3).toEqual({
      edges: [{ node: { userName: 'test3' }, donationCount: 1 }],
      totalCount: 2,
    })
  })

  test('retrieve topDonators with blockchain donations', async () => {
    const server = await testClient({
      isAuth: true,
      connections,
    })
    const recipientId = '1'
    const walletAddress = '0x1234567890123456789012345678901234567890'

    // Create blockchain donation
    await createBlockchainDonationTx(
      { recipientId, fromAddress: walletAddress },
      paymentService
    )

    const res = await server.executeOperation({
      query: GET_VIEWER_TOPDONATORS,
      variables: { input: {} },
    })

    const donators = res.data?.viewer?.analytics?.topDonators
    expect(donators).toEqual({
      edges: [{ node: { address: walletAddress }, donationCount: 1 }],
      totalCount: 1,
    })
  })

  test('retrieve topDonators with mixed user and blockchain donations', async () => {
    const server = await testClient({
      isAuth: true,
      connections,
    })
    const recipientId = '1'
    const walletAddress1 = '0x1234567890123456789012345678901234567890'
    const walletAddress2 = '0x0987654321098765432109876543210987654321'

    // Create user donation
    await createDonationTx({ recipientId, senderId: '2' }, paymentService)

    // Create blockchain donations
    await createBlockchainDonationTx(
      { recipientId, fromAddress: walletAddress1 },
      paymentService
    )
    await createBlockchainDonationTx(
      { recipientId, fromAddress: walletAddress2 },
      paymentService
    )

    const res = await server.executeOperation({
      query: GET_VIEWER_TOPDONATORS,
      variables: { input: {} },
    })

    const donators = res.data?.viewer?.analytics?.topDonators
    expect(donators.totalCount).toBe(3)
    expect(donators.edges).toEqual(
      expect.arrayContaining([
        { node: { userName: 'test2' }, donationCount: 1 },
        { node: { address: walletAddress1 }, donationCount: 1 },
        { node: { address: walletAddress2 }, donationCount: 1 },
      ])
    )
  })

  test('retrieve topDonators with multiple blockchain donations from same wallet', async () => {
    const server = await testClient({
      isAuth: true,
      connections,
    })
    const recipientId = '1'
    const walletAddress = '0x1234567890123456789012345678901234567890'

    // Create multiple blockchain donations from same wallet
    await createBlockchainDonationTx(
      { recipientId, fromAddress: walletAddress },
      paymentService
    )
    await createBlockchainDonationTx(
      { recipientId, fromAddress: walletAddress },
      paymentService
    )

    const res = await server.executeOperation({
      query: GET_VIEWER_TOPDONATORS,
      variables: { input: {} },
    })

    const donators = res.data?.viewer?.analytics?.topDonators
    expect(donators).toEqual({
      edges: [{ node: { address: walletAddress }, donationCount: 2 }],
      totalCount: 1,
    })
  })

  test('retrieve topDonators with blockchain donations pagination', async () => {
    const server = await testClient({
      isAuth: true,
      connections,
    })
    const recipientId = '1'
    const walletAddress1 = '0x1234567890123456789012345678901234567890'
    const walletAddress2 = '0x0987654321098765432109876543210987654321'

    // Create blockchain donations
    await createBlockchainDonationTx(
      { recipientId, fromAddress: walletAddress1 },
      paymentService
    )
    await createBlockchainDonationTx(
      { recipientId, fromAddress: walletAddress2 },
      paymentService
    )

    // Test pagination
    const res = await server.executeOperation({
      query: GET_VIEWER_TOPDONATORS,
      variables: { input: { first: 1 } },
    })

    const donators = res.data?.viewer?.analytics?.topDonators
    expect(donators.edges).toHaveLength(1)
    expect(donators.totalCount).toBe(2)
    expect(donators.edges[0].node.address).toBeDefined()
    expect(donators.edges[0].donationCount).toBe(1)
  })

  test('ignore failed blockchain transactions', async () => {
    const server = await testClient({
      isAuth: true,
      connections,
    })
    const recipientId = '1'
    const walletAddress = '0x1234567890123456789012345678901234567890'

    // Create successful blockchain donation
    await createBlockchainDonationTx(
      { recipientId, fromAddress: walletAddress },
      paymentService
    )

    // Create failed blockchain donation
    await createBlockchainDonationTx(
      {
        recipientId,
        fromAddress: walletAddress,
        state: BLOCKCHAIN_TRANSACTION_STATE.reverted,
      },
      paymentService
    )

    const res = await server.executeOperation({
      query: GET_VIEWER_TOPDONATORS,
      variables: { input: {} },
    })

    const donators = res.data?.viewer?.analytics?.topDonators
    expect(donators).toEqual({
      edges: [{ node: { address: walletAddress }, donationCount: 1 }],
      totalCount: 1,
    })
  })
})
