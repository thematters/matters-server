import type { Connections } from 'definitions'

import { NODE_TYPES } from 'common/enums'
import { toGlobalId } from 'common/utils'
import { GQLAppreciateArticleInput } from 'definitions'

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

const APPRECIATE_ARTICLE = /* GraphQL */ `
  mutation ($input: AppreciateArticleInput!) {
    appreciateArticle(input: $input) {
      appreciationsReceivedTotal
    }
  }
`

export const appreciateArticle = async (input: GQLAppreciateArticleInput) => {
  const server = await testClient({
    isAuth: true,
  })
  return await server.executeOperation({
    query: APPRECIATE_ARTICLE,
    variables: { input },
  })
}

describe('ratelimit', () => {
  test('should not return ratelimit error', async () => {
    const result = []
    for (let i = 0; i < 5; i++) {
      const { errors } = await appreciateArticle({
        id: toGlobalId({ type: NODE_TYPES.Article, id: 3 }),
        amount: 1,
      })
      if (errors) {
        result.push(errors)
      }
    }
    expect(result.length).toBe(0)
  })

  test('should return ratelimit error', async () => {
    const { errors } = await appreciateArticle({
      id: toGlobalId({ type: NODE_TYPES.Article, id: 3 }),
      amount: 1,
    })
    expect(errors[0].message).toBe(
      'rate exceeded for operation appreciateArticle'
    )
  })
})
