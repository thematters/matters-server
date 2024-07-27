import type { Connections } from 'definitions'

import { NODE_TYPES } from 'common/enums'
import { toGlobalId } from 'common/utils'

import { testClient, genConnections, closeConnections } from '../utils'

let connections: Connections

beforeAll(async () => {
  connections = await genConnections()
}, 30000)

afterAll(async () => {
  await closeConnections(connections)
})

const USER_ID = toGlobalId({ type: NODE_TYPES.User, id: 1 })
const GET_NOTICES = /* GraphQL */ `
  query ($nodeInput: NodeInput!) {
    node(input: $nodeInput) {
      ... on User {
        notices(input: { first: 100 }) {
          edges {
            node {
              id
              __typename
              createdAt
              unread
              ... on CommentNotice {
                commentNoticeType: type
                target {
                  id
                }
              }
              ... on MomentNotice {
                momentNoticeType: type
                target {
                  id
                }
              }
            }
          }
        }
      }
    }
  }
`

test('query notices', async () => {
  // viewer id is 1
  const server = await testClient({ isAuth: true, connections })
  const { data, errors } = await server.executeOperation({
    query: GET_NOTICES,
    variables: {
      nodeInput: { id: USER_ID },
    },
  })
  expect(errors).toBeUndefined()
  const notices = data.node.notices.edges
  expect(notices.length).toBeGreaterThan(0)
})
