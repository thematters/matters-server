import type { Connections } from 'definitions'

import { NotificationService, AtomService } from 'connectors'
import { NODE_TYPES, DB_NOTICE_TYPE } from 'common/enums'
import { toGlobalId } from 'common/utils'

import { testClient, genConnections, closeConnections } from '../utils'

let connections: Connections
let notificationService: NotificationService
let atomService: AtomService

beforeAll(async () => {
  connections = await genConnections()
  notificationService = new NotificationService(connections)
  atomService = new AtomService(connections)
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
                type
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
  const { data } = await server.executeOperation({
    query: GET_NOTICES,
    variables: {
      nodeInput: { id: USER_ID },
    },
  })
  const notices = data.node.notices.edges
  expect(notices.length).toBeGreaterThan(0)
})

test('query comment_liked notices', async () => {
  const comment = await atomService.commentIdLoader.load('2')
  const user = await atomService.userIdLoader.load(comment.authorId)

  // user like this comment
  const actorId = '1'
  expect(user.id).not.toBe(actorId)

  await notificationService.trigger({
    event: DB_NOTICE_TYPE.comment_liked,
    actorId,
    recipientId: comment.authorId,
    entities: [{ type: 'target', entityTable: 'comment', entity: comment }],
  })

  const server = await testClient({
    isAuth: true,
    connections,
    context: { viewer: user },
  })
  const { data, errors } = await server.executeOperation({
    query: GET_NOTICES,
    variables: {
      nodeInput: {
        id: toGlobalId({ type: NODE_TYPES.User, id: comment.authorId }),
      },
    },
  })
  expect(errors).toBeUndefined()
  expect(data.node.notices.edges[0].node.type).toBe('CommentLiked')
  expect(data.node.notices.edges[0].node.target.id).toBe(
    toGlobalId({ type: NODE_TYPES.Comment, id: comment.id })
  )
})
