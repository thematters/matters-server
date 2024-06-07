import type { Connections } from 'definitions'

import { v4 } from 'uuid'

import {
  USER_STATE,
  JOURNAL_STATE,
  MAX_JOURNAL_LENGTH,
  IMAGE_ASSET_TYPE,
} from 'common/enums'
import {
  ForbiddenError,
  ForbiddenByStateError,
  UserInputError,
} from 'common/errors'
import { JournalService, UserService, SystemService } from 'connectors'

import { genConnections, closeConnections } from './utils'

let connections: Connections
let journalService: JournalService
let userService: UserService
let systemService: SystemService

beforeAll(async () => {
  connections = await genConnections()
  journalService = new JournalService(connections)
  userService = new UserService(connections)
  systemService = new SystemService(connections)
}, 30000)

afterAll(async () => {
  await closeConnections(connections)
})

describe('create journals', () => {
  const user = { id: '1', state: USER_STATE.active, userName: 'testuser' }
  const data = { content: 'test', assetIds: [] }
  test('not active user will fail', async () => {
    const bannedUser = {
      id: '1',
      state: USER_STATE.banned,
      userName: 'testuser',
    }
    expect(journalService.create(data, bannedUser)).rejects.toThrowError(
      ForbiddenByStateError
    )
  })
  test('content length is checked', async () => {
    expect(journalService.create({ content: '' }, user)).rejects.toThrowError(
      UserInputError
    )
    expect(
      journalService.create(
        { content: 'a'.repeat(MAX_JOURNAL_LENGTH + 1) },
        user
      )
    ).rejects.toThrowError(UserInputError)
    expect(
      journalService.create({ content: 'a'.repeat(MAX_JOURNAL_LENGTH) }, user)
    ).resolves.toBeDefined()
  })
  test('assets are checked', async () => {
    // wrong author
    expect(
      journalService.create({ content: 'test', assetIds: ['2'] }, user)
    ).rejects.toThrowError(UserInputError)
    // wrong type
    expect(
      journalService.create({ content: 'test', assetIds: ['1'] }, user)
    ).rejects.toThrowError(UserInputError)

    const asset = await systemService.findAssetOrCreateByPath(
      {
        uuid: v4(),
        authorId: user.id,
        type: IMAGE_ASSET_TYPE.journal,
        path: 'test.jpg',
      },
      '1',
      '1'
    )
    expect(
      journalService.create({ content: 'test', assetIds: [asset.id] }, user)
    ).resolves.toBeDefined()
  })
  test('active user will success', async () => {
    const journal = await journalService.create(data, user)
    expect(journal).toBeDefined()
    expect(journal.content).toBe(data.content)
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
