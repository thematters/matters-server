import type { Connections } from '#definitions/index.js'

import { NODE_TYPES } from '#common/enums/index.js'
import { toGlobalId, fromGlobalId } from '#common/utils/index.js'

import { testClient, genConnections, closeConnections } from '../utils.js'

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
  for (const notice of notices) {
    expect(fromGlobalId(notice.node.id).type).toBe(NODE_TYPES.Notice)
    expect(notice.node.__typename).toBeDefined()
    expect(notice.node.createdAt).toBeDefined()
    expect(notice.node.unread).toBeDefined()
    if (notice.node.__typename === 'CommentNotice') {
      expect(notice.node.commentNoticeType).toBeDefined()
      expect(notice.node.target.id).toBeDefined()
    } else if (notice.node.__typename === 'MomentNotice') {
      expect(notice.node.momentNoticeType).toBeDefined()
      expect(notice.node.target.id).toBeDefined()
    }
  }
})
