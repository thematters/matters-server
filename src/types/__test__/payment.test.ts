import _get from 'lodash/get'

import { NODE_TYPES } from 'common/enums'
import { toGlobalId } from 'common/utils'
import {
  GQLChain,
  GQLTransactionCurrency,
  GQLTransactionPurpose,
} from 'definitions'

import { testClient } from './utils'

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
  const currency = GQLTransactionCurrency.USDT
  const purpose = GQLTransactionPurpose.donation
  const senderId = toGlobalId({ type: NODE_TYPES.User, id: 1 })
  const recipientId = toGlobalId({ type: NODE_TYPES.User, id: 2 })
  const wrongRecipientId = toGlobalId({ type: NODE_TYPES.User, id: 3 })
  const targetId = toGlobalId({ type: NODE_TYPES.Article, id: 2 })
  const chain = GQLChain.Polygon
  const txHash =
    '0xd65dc6bf6dcc111237f9acfbfa6003ea4a4d88f2e071f4307d3af81ae877f7be'
  test('cannot donate yourself', async () => {
    const server = await testClient({
      isAuth: true,
    })
    const result = await server.executeOperation({
      query: PAYTO,
      variables: {
        input: { amount, currency, purpose, recipientId: senderId, targetId },
      },
    })
    expect(_get(result, 'errors.0.message')).toBe('cannot payTo yourself')
  })
  test('cannot donate to wrong recipient', async () => {
    const server = await testClient({
      isAuth: true,
    })
    const result = await server.executeOperation({
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
    expect(_get(result, 'errors.0.message')).toBe(
      'target author is not the same as the recipient'
    )
  })
  test('cannot call USDT payTo without `chain`', async () => {
    const server = await testClient({
      isAuth: true,
    })
    const result = await server.executeOperation({
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
    expect(_get(result, 'errors.0.message')).toBe(
      '`chain` is required if `currency` is `USDT`'
    )
  })
  test('cannot call USDT payTo without `txHash`', async () => {
    const server = await testClient({
      isAuth: true,
    })
    const result = await server.executeOperation({
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
    expect(_get(result, 'errors.0.message')).toBe(
      '`txHash` is required if `currency` is `USDT`'
    )
  })
  test('cannot call USDT payTo with bad `txHash`', async () => {
    const server = await testClient({
      isAuth: true,
    })
    const result = await server.executeOperation({
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
    expect(_get(result, 'errors.0.message')).toBe('invalid transaction hash')
  })
  test('can call USDT payTo', async () => {
    const server = await testClient({
      isAuth: true,
    })
    const result = await server.executeOperation({
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
    expect(_get(result, 'data.payTo.transaction.amount')).toBe(amount)
    expect(_get(result, 'data.payTo.transaction.state')).toBe('pending')
    expect(_get(result, 'data.payTo.transaction.blockchainTx.chain')).toBe(
      chain
    )
    expect(_get(result, 'data.payTo.transaction.blockchainTx.txHash')).toBe(
      txHash
    )
  })
})
