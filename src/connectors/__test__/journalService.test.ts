import type { Connections } from 'definitions'

import { USER_STATE, JOURNAL_STATE } from 'common/enums'
import {
  ForbiddenError,
  ForbiddenByStateError,
  UserInputError,
} from 'common/errors'
import { JournalService, UserService } from 'connectors'

import { genConnections, closeConnections } from './utils'

let connections: Connections
let journalService: JournalService
let userService: UserService

beforeAll(async () => {
  connections = await genConnections()
  journalService = new JournalService(connections)
  userService = new UserService(connections)
}, 30000)

afterAll(async () => {
  await closeConnections(connections)
})

describe('create journals', () => {
  test('not active user will fail', async () => {
    const user = { id: '1', state: USER_STATE.banned, userName: 'testuser' }
    const data = { content: 'test', assetIds: [] }
    expect(journalService.create(data, user)).rejects.toThrowError(
      ForbiddenByStateError
    )
  })
  test('active user will success', async () => {
    const user = { id: '1', state: USER_STATE.active, userName: 'testuser' }
    const data = { content: 'test', assetIds: [] }
    const journal = await journalService.create(data, user)
    expect(journal).toBeDefined()
    expect(journal.content).toBe(data.content)
  })
  test('active user with assetIds will success', async () => {
    const user = { id: '1', state: USER_STATE.active, userName: 'testuser' }
    const data = { content: 'test', assetIds: ['1', '2'] }
    const journal = await journalService.create(data, user)
    expect(journal).toBeDefined()
    expect(journal.content).toBe(data.content)

    const assets = await journalService.getAssets(journal.id)
    expect(assets).toHaveLength(2)
  })
})

describe('delete journals', () => {
  test('not active/banned user will fail', async () => {
    const user = { id: '1', state: USER_STATE.archived }
    const journal = await journalService.create(
      { content: 'test', assetIds: [] },
      { id: user.id, state: USER_STATE.active, userName: 'testuser' }
    )
    expect(journalService.delete(journal.id, user)).rejects.toThrowError(
      ForbiddenByStateError
    )
  })
  test('not author will fail', async () => {
    const author = { id: '1', state: USER_STATE.active, userName: 'testuser' }
    const other = { id: '2', state: USER_STATE.active }
    const journal = await journalService.create(
      { content: 'test', assetIds: [] },
      author
    )
    expect(journalService.delete(journal.id, other)).rejects.toThrowError(
      ForbiddenError
    )
  })
  test('author will success', async () => {
    const author = { id: '1', state: USER_STATE.active, userName: 'testuser' }
    const journal = await journalService.create(
      { content: 'test', assetIds: [] },
      author
    )
    const updated = await journalService.delete(journal.id, author)
    expect(updated.state).toBe(JOURNAL_STATE.archived)
  })
})

describe('like/unklike journals', () => {
  test('not active user will fail', async () => {
    const user = { id: '1', state: USER_STATE.banned }
    const journal = await journalService.create(
      { content: 'test', assetIds: [] },
      { id: '2', state: USER_STATE.active, userName: 'testuser' }
    )
    expect(journalService.like(journal.id, user)).rejects.toThrowError(
      ForbiddenByStateError
    )
  })
  test('author will fail', async () => {
    const author = { id: '1', state: USER_STATE.active }
    const journal = await journalService.create(
      { content: 'test', assetIds: [] },
      { id: author.id, state: USER_STATE.active, userName: 'testuser' }
    )
    expect(journalService.like(journal.id, author)).rejects.toThrowError(
      ForbiddenError
    )
  })
  test('archived journal will fail', async () => {
    const user = { id: '1', state: USER_STATE.active }
    const journal = await journalService.create(
      { content: 'test', assetIds: [] },
      { id: '2', state: USER_STATE.active, userName: 'testuser' }
    )
    await journalService.delete(journal.id, {
      id: '2',
      state: USER_STATE.active,
    })
    expect(journalService.like(journal.id, user)).rejects.toThrowError(
      UserInputError
    )
  })
  test('success', async () => {
    const user = { id: '1', state: USER_STATE.active }
    const journal = await journalService.create(
      { content: 'test', assetIds: [] },
      { id: '2', state: USER_STATE.active, userName: 'testuser' }
    )
    expect(journalService.isLiked(journal.id, user.id)).resolves.toBe(false)
    await journalService.like(journal.id, user)
    expect(journalService.isLiked(journal.id, user.id)).resolves.toBe(true)

    // like multiple times is idempotent
    await journalService.like(journal.id, user)
    expect(journalService.isLiked(journal.id, user.id)).resolves.toBe(true)

    // unlike multiple times is idempotent
    await journalService.unlike(journal.id, user)
    expect(journalService.isLiked(journal.id, user.id)).resolves.toBe(false)
    await journalService.unlike(journal.id, user)
    expect(journalService.isLiked(journal.id, user.id)).resolves.toBe(false)
  })
  test('count likes', async () => {
    const journal = await journalService.create(
      { content: 'test', assetIds: [] },
      { id: '1', state: USER_STATE.active, userName: 'testuser' }
    )
    expect(journalService.countLikes(journal.id)).resolves.toBe(0)
    await journalService.like(journal.id, { id: '2', state: USER_STATE.active })
    await journalService.like(journal.id, { id: '2', state: USER_STATE.active })
    expect(journalService.countLikes(journal.id)).resolves.toBe(1)
  })
  test('blocked user will fail', async () => {
    const user = { id: '3', state: USER_STATE.active }
    const author = { id: '4', state: USER_STATE.active, userName: 'testuser' }
    const journal = await journalService.create(
      { content: 'test', assetIds: [] },
      author
    )
    await userService.block(author.id, user.id)
    expect(journalService.like(journal.id, user)).rejects.toThrowError(
      ForbiddenError
    )
  })
})
