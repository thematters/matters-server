import type { Connections } from 'definitions'

import { NODE_TYPES } from 'common/enums'
import { toGlobalId } from 'common/utils'
import { JournalService } from 'connectors'

import { genConnections, closeConnections, testClient } from '../utils'

let connections: Connections
let journalService: JournalService

beforeAll(async () => {
  connections = await genConnections()
  journalService = new JournalService(connections)
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
      { content: 'test', assetIds: ['1', '2'] },
      { id: '1', state: 'active', userName: 'test' }
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
      { content: 'test', assetIds: ['1', '2'] },
      { id: '1', state: 'active', userName: 'test' }
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
    const server = await testClient({ isAuth: true, connections })
    const content = 'test'
    const assetIds = [
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002',
    ]
    const { errors, data } = await server.executeOperation({
      query: PUT_JOURNAL,
      variables: { input: { content, assets: assetIds } },
    })
    expect(errors).toBeUndefined()
    console.dir(data, { depth: null })
  })
})
