import type { Connections } from 'definitions'

import { NotificationService, AtomService, MomentService } from 'connectors'
import { NODE_TYPES, NOTICE_TYPE, USER_STATE } from 'common/enums'
import { toGlobalId } from 'common/utils'

import { testClient, genConnections, closeConnections } from '../utils'

let connections: Connections
let notificationService: NotificationService
let atomService: AtomService
let momentService: MomentService

beforeAll(async () => {
  connections = await genConnections()
  notificationService = new NotificationService(connections)
  atomService = new AtomService(connections)
  momentService = new MomentService(connections)
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

test('query comment_liked notices', async () => {
  const comment = await atomService.commentIdLoader.load('2')
  const user = await atomService.userIdLoader.load(comment.authorId)

  // user like this comment
  const actorId = '1'
  expect(user.id).not.toBe(actorId)

  await notificationService.trigger({
    event: NOTICE_TYPE.article_comment_liked,
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
  expect(data.node.notices.edges[0].node.commentNoticeType).toBe('CommentLiked')
  expect(data.node.notices.edges[0].node.target.id).toBe(
    toGlobalId({ type: NODE_TYPES.Comment, id: comment.id })
  )
})

test('query moment_liked notices', async () => {
  const moment = await momentService.create(
    { content: 'test' },
    { id: '4', state: USER_STATE.active, userName: 'test' }
  )
  const user = await atomService.userIdLoader.load(moment.authorId)

  // user like this comment
  const actorId = '2'
  expect(user.id).not.toBe(actorId)

  await notificationService.trigger({
    event: NOTICE_TYPE.moment_liked,
    actorId,
    recipientId: moment.authorId,
    entities: [{ type: 'target', entityTable: 'moment', entity: moment }],
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
        id: toGlobalId({ type: NODE_TYPES.User, id: moment.authorId }),
      },
    },
  })
  expect(errors).toBeUndefined()
  expect(data.node.notices.edges[0].node.momentNoticeType).toBe('MomentLiked')
  expect(data.node.notices.edges[0].node.target.id).toBe(
    toGlobalId({ type: NODE_TYPES.Moment, id: moment.id })
  )
})
