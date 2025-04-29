import type { Connections } from '#definitions/index.js'

import _get from 'lodash/get.js'

import { MATERIALIZED_VIEW } from '#common/enums/index.js'
import { fromGlobalId } from '#common/utils/index.js'
import { refreshView } from '#connectors/__test__/utils.js'

import { testClient, genConnections, closeConnections } from '../../utils.js'

let connections: Connections

beforeAll(async () => {
  connections = await genConnections()
}, 50000)

afterAll(async () => {
  await closeConnections(connections)
})

const GET_AUTHOR_RECOMMENDATION = (list: string) => /* GraphQL */ `
  query($input: RecommendInput!) {
    viewer {
      recommendation {
        ${list}(input: $input) {
          edges {
            node {
              id
          }
        }
      }
    }
  }
}
`

describe('authors', () => {
  test('retrive users from authors', async () => {
    await refreshView(
      MATERIALIZED_VIEW.user_reader_materialized,
      connections.knex
    )

    const server = await testClient({
      isAuth: true,
      connections,
    })
    const { data } = await server.executeOperation({
      query: GET_AUTHOR_RECOMMENDATION('authors'),
      variables: { input: { first: 1 } },
    })
    const author = _get(data, 'viewer.recommendation.authors.edges.0.node')
    expect(fromGlobalId(author.id).type).toBe('User')
  })
})
