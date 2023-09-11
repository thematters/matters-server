import type { Connections } from 'definitions'

import {
  NODE_TYPES,
  BLOCKCHAIN,
  TRANSACTION_PURPOSE,
  PAYMENT_CURRENCY,
} from 'common/enums'
import { toGlobalId } from 'common/utils'

import { testClient, genConnections, closeConnections } from '../utils'

declare global {
  // eslint-disable-next-line no-var
  var connections: Connections
}

let connections: Connections
beforeAll(async () => {
  connections = await genConnections()
  globalThis.connections = connections
}, 30000)

afterAll(async () => {
  await closeConnections(connections)
})

describe('donation', () => {
  const PAYTO = /* GraphQL */ `
    mutation ($input: PayToInput!) {
      payTo(input: $input) {
        transaction {
          amount
          state
        }
      }
    }
  `
  const PAYTO_USDT = /* GraphQL */ `
    mutation ($input: PayToInput!) {
      payTo(input: $input) {
        transaction {
          amount
          state
          blockchainTx {
            chain
            txHash
          }
        }
      }
    }
  `
  const amount = 1.1
  const currency = PAYMENT_CURRENCY.USDT
  const purpose = TRANSACTION_PURPOSE.donation
  const senderId = toGlobalId({ type: NODE_TYPES.User, id: 1 })
  const recipientId = toGlobalId({ type: NODE_TYPES.User, id: 2 })
  const wrongRecipientId = toGlobalId({ type: NODE_TYPES.User, id: 3 })
  const targetId = toGlobalId({ type: NODE_TYPES.Article, id: 2 })
  const chain = BLOCKCHAIN.Polygon
  const txHash =
    '0xd65dc6bf6dcc111237f9acfbfa6003ea4a4d88f2e071f4307d3af81ae877f7be'
  test('cannot donate yourself', async () => {
    const server = await testClient({
      isAuth: true,
    })
    const { errors } = await server.executeOperation({
      query: PAYTO,
      variables: {
        input: { amount, currency, purpose, recipientId: senderId, targetId },
      },
    })
    expect(errors[0]?.message).toBe('cannot payTo yourself')
  })
  test('cannot donate to wrong recipient', async () => {
    const server = await testClient({
      isAuth: true,
    })
    const { errors } = await server.executeOperation({
      query: PAYTO,
      variables: {
        input: {
          amount,
          currency,
          purpose,
          recipientId: wrongRecipientId,
          targetId,
        },
      },
    })
    expect(errors[0]?.message).toBe(
      'target author is not the same as the recipient'
    )
  })
  test('cannot call USDT payTo without `chain`', async () => {
    const server = await testClient({
      isAuth: true,
    })
    const { errors } = await server.executeOperation({
      query: PAYTO_USDT,
      variables: {
        input: {
          amount,
          currency,
          purpose,
          recipientId,
          targetId,
        },
      },
    })
    expect(errors[0]?.message).toBe(
      '`chain` is required if `currency` is `USDT`'
    )
  })
  test('cannot call USDT payTo without `txHash`', async () => {
    const server = await testClient({
      isAuth: true,
    })
    const { errors } = await server.executeOperation({
      query: PAYTO_USDT,
      variables: {
        input: {
          amount,
          currency,
          purpose,
          recipientId,
          targetId,
          chain,
        },
      },
    })
    expect(errors[0]?.message).toBe(
      '`txHash` is required if `currency` is `USDT`'
    )
  })
  test('cannot call USDT payTo with bad `txHash`', async () => {
    const server = await testClient({
      isAuth: true,
    })
    const { errors } = await server.executeOperation({
      query: PAYTO_USDT,
      variables: {
        input: {
          amount,
          currency,
          purpose,
          recipientId,
          targetId,
          chain,
          txHash: 'badTxHash',
        },
      },
    })
    expect(errors[0]?.message).toBe('invalid transaction hash')
  })
  test('banned users can not donate', async () => {
    const server = await testClient({
      isAuth: true,
      isBanned: true,
    })
    const { errors } = await server.executeOperation({
      query: PAYTO_USDT,
      variables: {
        input: {
          amount,
          currency,
          purpose,
          recipientId,
          targetId,
          chain,
          txHash,
        },
      },
    })
    expect(errors[0]?.message).toBe('banned user has no permission')
  })
  test('can call USDT payTo', async () => {
    const server = await testClient({
      isAuth: true,
    })
    const {
      data: {
        payTo: { transaction },
      },
    } = await server.executeOperation({
      query: PAYTO_USDT,
      variables: {
        input: {
          amount,
          currency,
          purpose,
          recipientId,
          targetId,
          chain,
          txHash,
        },
      },
    })
    expect(transaction.amount).toBe(amount)
    expect(transaction.state).toBe('pending')
    expect(transaction.blockchainTx.chain).toBe(chain)
    expect(transaction.blockchainTx.txHash).toBe(txHash)
  })
})

describe('payout', () => {
  const PAYOUT = /* GraphQL */ `
    mutation ($input: PayoutInput!) {
      payout(input: $input) {
        amount
        state
      }
    }
  `
  test('banned users cannot payout', async () => {
    const server = await testClient({
      isAuth: true,
      isBanned: true,
    })
    const { errors } = await server.executeOperation({
      query: PAYOUT,
      variables: {
        input: {
          amount: 500,
          password: '123456',
        },
      },
    })
    expect(errors[0]?.message).toBe('banned user has no permission')
  })
})
