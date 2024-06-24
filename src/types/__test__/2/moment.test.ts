import type { Connections } from 'definitions'

import { v4 } from 'uuid'

import { NODE_TYPES, USER_STATE, IMAGE_ASSET_TYPE } from 'common/enums'
import { toGlobalId } from 'common/utils'
import { MomentService, SystemService } from 'connectors'

import { genConnections, closeConnections, testClient } from '../utils'

let connections: Connections
let momentService: MomentService
let systemService: SystemService

beforeAll(async () => {
  connections = await genConnections()
  momentService = new MomentService(connections)
  systemService = new SystemService(connections)
}, 50000)

afterAll(async () => {
  await closeConnections(connections)
})

describe('query moment', () => {
  const GET_MOMENT = /* GraphQL */ `
    query ($input: NodeInput!) {
      node(input: $input) {
        ... on Moment {
          id
          author {
            id
          }
          content
          assets {
            id
          }
          state
          commentCount
          comments(input: { first: 10 }) {
            edges {
              node {
                id
              }
            }
          }
          commentedFollowees {
            id
          }
          likeCount
          liked
          createdAt
        }
      }
    }
  `
  test('visitors can query', async () => {
    const moment = await momentService.create(
      { content: 'test' },
      { id: '1', state: USER_STATE.active, userName: 'test' }
    )
    const momentId = toGlobalId({ type: NODE_TYPES.Moment, id: moment.id })
    const server = await testClient({ connections })
    const { errors, data } = await server.executeOperation({
      query: GET_MOMENT,
      variables: { input: { id: momentId } },
    })
    expect(errors).toBeUndefined()
    expect(data.node.id).toBe(momentId)
    expect(data.node.commentedFollowees).toEqual([])
    expect(data.node.liked).toBeFalsy()
  })
  test('logged-in users can query', async () => {
    const moment = await momentService.create(
      { content: 'test' },
      { id: '1', state: USER_STATE.active, userName: 'test' }
    )
    const momentId = toGlobalId({ type: NODE_TYPES.Moment, id: moment.id })
    const server = await testClient({ isAuth: true, connections })
    const { errors } = await server.executeOperation({
      query: GET_MOMENT,
      variables: { input: { id: momentId } },
    })
    expect(errors).toBeUndefined()
  })
})

describe('create moment', () => {
  const PUT_MOMENT = /* GraphQL */ `
    mutation ($input: PutMomentInput!) {
      putMoment(input: $input) {
        id
        assets {
          id
        }
      }
    }
  `
  test('success', async () => {
    const viewer = { id: '1', state: USER_STATE.active, userName: 'test' }
    const server = await testClient({
      connections,
      context: { viewer },
      isAuth: true,
    })
    const content = 'test'
    const asset = await systemService.findAssetOrCreateByPath(
      {
        uuid: v4(),
        authorId: viewer.id,
        type: IMAGE_ASSET_TYPE.moment,
        path: 'test.jpg',
      },
      '1',
      '1'
    )
    const { errors } = await server.executeOperation({
      query: PUT_MOMENT,
      variables: { input: { content, assets: [asset.uuid] } },
    })
    expect(errors).toBeUndefined()
  })
})

describe('delete moment', () => {
  const DELETE_MOMENT = /* GraphQL */ `
    mutation ($input: DeleteMomentInput!) {
      deleteMoment(input: $input)
    }
  `
  test('success', async () => {
    const viewer = { id: '1', state: USER_STATE.active, userName: 'test' }
    const moment = await momentService.create({ content: 'test' }, viewer)
    const server = await testClient({
      connections,
      context: { viewer },
      isAuth: true,
    })
    const id = toGlobalId({ type: NODE_TYPES.Moment, id: moment.id })
    const { errors, data } = await server.executeOperation({
      query: DELETE_MOMENT,
      variables: { input: { id } },
    })
    expect(errors).toBeUndefined()
    expect(data.deleteMoment).toBeTruthy()
  })
})

describe('like/unlike moment', () => {
  const LIKE_MOMENT = /* GraphQL */ `
    mutation ($input: LikeMomentInput!) {
      likeMoment(input: $input) {
        id
        liked
      }
    }
  `
  const UNLIKE_MOMENT = /* GraphQL */ `
    mutation ($input: UnlikeMomentInput!) {
      unlikeMoment(input: $input) {
        id
        liked
      }
    }
  `
  test('success', async () => {
    const author = { id: '5', state: USER_STATE.active, userName: 'test' }
    const moment = await momentService.create({ content: 'test' }, author)
    const server = await testClient({ isAuth: true, connections })
    const id = toGlobalId({ type: NODE_TYPES.Moment, id: moment.id })

    const { errors: errorsLike, data: dataLike } =
      await server.executeOperation({
        query: LIKE_MOMENT,
        variables: { input: { id } },
      })
    expect(errorsLike).toBeUndefined()
    expect(dataLike.likeMoment.liked).toBeTruthy()

    const { errors: errorsUnlike, data: dataUnlike } =
      await server.executeOperation({
        query: UNLIKE_MOMENT,
        variables: { input: { id } },
      })
    expect(errorsUnlike).toBeUndefined()
    expect(dataUnlike.unlikeMoment.liked).toBeFalsy()
  })
})
