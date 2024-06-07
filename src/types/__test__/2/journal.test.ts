import type { Connections } from 'definitions'

import { v4 } from 'uuid'

import { NODE_TYPES, USER_STATE, IMAGE_ASSET_TYPE } from 'common/enums'
import { toGlobalId } from 'common/utils'
import { JournalService, SystemService } from 'connectors'

import { genConnections, closeConnections, testClient } from '../utils'

let connections: Connections
let journalService: JournalService
let systemService: SystemService

beforeAll(async () => {
  connections = await genConnections()
  journalService = new JournalService(connections)
  systemService = new SystemService(connections)
}, 50000)

afterAll(async () => {
  await closeConnections(connections)
})

describe('query journal', () => {
  const GET_JOURNAL = /* GraphQL */ `
    query ($input: NodeInput!) {
      node(input: $input) {
        ... on Journal {
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
    const journal = await journalService.create(
      { content: 'test' },
      { id: '1', state: USER_STATE.active, userName: 'test' }
    )
    const journalId = toGlobalId({ type: NODE_TYPES.Journal, id: journal.id })
    const server = await testClient({ connections })
    const { errors, data } = await server.executeOperation({
      query: GET_JOURNAL,
      variables: { input: { id: journalId } },
    })
    expect(errors).toBeUndefined()
    expect(data.node.id).toBe(journalId)
    expect(data.node.commentedFollowees).toEqual([])
    expect(data.node.liked).toBeFalsy()
  })
  test('logged-in users can query', async () => {
    const journal = await journalService.create(
      { content: 'test' },
      { id: '1', state: USER_STATE.active, userName: 'test' }
    )
    const journalId = toGlobalId({ type: NODE_TYPES.Journal, id: journal.id })
    const server = await testClient({ isAuth: true, connections })
    const { errors } = await server.executeOperation({
      query: GET_JOURNAL,
      variables: { input: { id: journalId } },
    })
    expect(errors).toBeUndefined()
  })
})

describe('create journal', () => {
  const PUT_JOURNAL = /* GraphQL */ `
    mutation ($input: PutJournalInput!) {
      putJournal(input: $input) {
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
        type: IMAGE_ASSET_TYPE.journal,
        path: 'test.jpg',
      },
      '1',
      '1'
    )
    const { errors } = await server.executeOperation({
      query: PUT_JOURNAL,
      variables: { input: { content, assets: [asset.uuid] } },
    })
    expect(errors).toBeUndefined()
  })
})

describe('delete journal', () => {
  const DELETE_JOURNAL = /* GraphQL */ `
    mutation ($input: DeleteJournalInput!) {
      deleteJournal(input: $input)
    }
  `
  test('success', async () => {
    const viewer = { id: '1', state: USER_STATE.active, userName: 'test' }
    const journal = await journalService.create({ content: 'test' }, viewer)
    const server = await testClient({
      connections,
      context: { viewer },
      isAuth: true,
    })
    const id = toGlobalId({ type: NODE_TYPES.Journal, id: journal.id })
    const { errors, data } = await server.executeOperation({
      query: DELETE_JOURNAL,
      variables: { input: { id } },
    })
    expect(errors).toBeUndefined()
    expect(data.deleteJournal).toBeTruthy()
  })
})

describe('like/unlike journal', () => {
  const LIKE_JOURNAL = /* GraphQL */ `
    mutation ($input: LikeJournalInput!) {
      likeJournal(input: $input) {
        id
        liked
      }
    }
  `
  const UNLIKE_JOURNAL = /* GraphQL */ `
    mutation ($input: UnlikeJournalInput!) {
      unlikeJournal(input: $input) {
        id
        liked
      }
    }
  `
  test('success', async () => {
    const author = { id: '5', state: USER_STATE.active, userName: 'test' }
    const journal = await journalService.create({ content: 'test' }, author)
    const server = await testClient({ isAuth: true, connections })
    const id = toGlobalId({ type: NODE_TYPES.Journal, id: journal.id })

    const { errors: errorsLike, data: dataLike } =
      await server.executeOperation({
        query: LIKE_JOURNAL,
        variables: { input: { id } },
      })
    expect(errorsLike).toBeUndefined()
    expect(dataLike.likeJournal.liked).toBeTruthy()

    const { errors: errorsUnlike, data: dataUnlike } =
      await server.executeOperation({
        query: UNLIKE_JOURNAL,
        variables: { input: { id } },
      })
    expect(errorsUnlike).toBeUndefined()
    expect(dataUnlike.unlikeJournal.liked).toBeFalsy()
  })
})
