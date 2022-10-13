import _get from 'lodash/get'

import { NODE_TYPES } from 'common/enums'
import { toGlobalId } from 'common/utils'
import { GQLTransactionCurrency, GQLTransactionPurpose } from 'definitions'

import { testClient } from './utils'

describe('donation', () => {
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
  // const recipientId = toGlobalId({ type: NODE_TYPES.User, id: 2 })
  const wrongRecipientId = toGlobalId({ type: NODE_TYPES.User, id: 2 })
  const targetId = toGlobalId({ type: NODE_TYPES.Article, id: 1 })
  test('cannot donate yourself', async () => {
    const server = await testClient({
      isAuth: true,
    })
    const result = await server.executeOperation({
      query: PAYTO_USDT,
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
      query: PAYTO_USDT,
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
})
