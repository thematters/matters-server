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
const GET_VIEWER_RECOMMENDATION_TAGS = /* GraphQL */ `
  query ($input: RecommendInput!) {
    viewer {
      recommendation {
        tags(input: $input) {
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
test('retrieve tags from tags', async () => {
  await refreshView(
    MATERIALIZED_VIEW.curation_tag_materialized,
    connections.knex
  )

  const serverNew = await testClient({
    isAuth: true,
    connections,
  })
  const { data } = await serverNew.executeOperation({
    query: GET_VIEWER_RECOMMENDATION_TAGS,
    variables: { input: { first: 1 } },
  })
  const tag = _get(data, 'viewer.recommendation.tags.edges.0.node')
  if (tag) {
    expect(fromGlobalId(tag.id).type).toBe('Tag')
  }
})
