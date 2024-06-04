import type { Connections } from 'definitions'

import { USER_STATE, JOURNAL_STATE } from 'common/enums'
import {
  ForbiddenError,
  ForbiddenByStateError,
  UserInputError,
} from 'common/errors'
import { AtomService, JournalService } from 'connectors'

import { genConnections, closeConnections } from './utils'

let connections: Connections
let atomService: AtomService
let journalService: JournalService

beforeAll(async () => {
  connections = await genConnections()
  atomService = new AtomService(connections)
  journalService = new JournalService(connections)
}, 30000)

afterAll(async () => {
  await closeConnections(connections)
})

describe('create journals', () => {
  test('not active user will fail', async () => {
    const actor = { id: '1', state: USER_STATE.banned }
    const data = { content: 'test', assetIds: [] }
    expect(journalService.create(data, actor)).rejects.toThrowError(
      ForbiddenByStateError
    )
  })
  test('active user will success', async () => {
    const actor = { id: '1', state: USER_STATE.active }
    const data = { content: 'test', assetIds: [] }
    const journal = await journalService.create(data, actor)
    expect(journal).toBeDefined()
    expect(journal.content).toBe(data.content)
  })
  test('active user with assetIds will success', async () => {
    const actor = { id: '1', state: USER_STATE.active }
    const data = { content: 'test', assetIds: ['1', '2'] }
    const journal = await journalService.create(data, actor)
    expect(journal).toBeDefined()
    expect(journal.content).toBe(data.content)

    const assets = await atomService.findMany({
      table: 'journal_asset',
      where: { journalId: journal.id },
    })
    expect(assets).toHaveLength(2)
  })
})

describe('delete journals', () => {
  test('not active user will fail', async () => {
    const actor = { id: '1', state: USER_STATE.banned }
    const journal = await journalService.create(
      { content: 'test', assetIds: [] },
      { id: actor.id, state: USER_STATE.active }
    )
    expect(journalService.delete(journal.id, actor)).rejects.toThrowError(
      ForbiddenByStateError
    )
  })
  test('not author will fail', async () => {
    const author = { id: '1', state: USER_STATE.active }
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
    const author = { id: '1', state: USER_STATE.active }
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
    const actor = { id: '1', state: USER_STATE.banned }
    const journal = await journalService.create(
      { content: 'test', assetIds: [] },
      { id: '2', state: USER_STATE.active }
    )
    expect(journalService.like(journal.id, actor)).rejects.toThrowError(
      ForbiddenByStateError
    )
  })
  test('author will fail', async () => {
    const author = { id: '1', state: USER_STATE.active }
    const journal = await journalService.create(
      { content: 'test', assetIds: [] },
      { id: author.id, state: USER_STATE.active }
    )
    expect(journalService.like(journal.id, author)).rejects.toThrowError(
      ForbiddenError
    )
  })
  test('archived journal will fail', async () => {
    const actor = { id: '1', state: USER_STATE.active }
    const journal = await journalService.create(
      { content: 'test', assetIds: [] },
      { id: '2', state: USER_STATE.active }
    )
    await journalService.delete(journal.id, {
      id: '2',
      state: USER_STATE.active,
    })
    expect(journalService.like(journal.id, actor)).rejects.toThrowError(
      UserInputError
    )
  })
  test('success', async () => {
    const actor = { id: '1', state: USER_STATE.active }
    const journal = await journalService.create(
      { content: 'test', assetIds: [] },
      { id: '2', state: USER_STATE.active }
    )
    expect(journalService.checkIfLiked(journal.id, actor.id)).resolves.toBe(
      false
    )
    await journalService.like(journal.id, actor)
    expect(journalService.checkIfLiked(journal.id, actor.id)).resolves.toBe(
      true
    )

    // like multiple times is idempotent
    await journalService.like(journal.id, actor)
    expect(journalService.checkIfLiked(journal.id, actor.id)).resolves.toBe(
      true
    )

    // unlike multiple times is idempotent
    await journalService.unlike(journal.id, actor)
    expect(journalService.checkIfLiked(journal.id, actor.id)).resolves.toBe(
      false
    )
    await journalService.unlike(journal.id, actor)
    expect(journalService.checkIfLiked(journal.id, actor.id)).resolves.toBe(
      false
    )
  })
})
