import type { Connections } from 'definitions'

import { v4 } from 'uuid'

import {
  USER_STATE,
  MOMENT_STATE,
  MAX_MOMENT_LENGTH,
  IMAGE_ASSET_TYPE,
} from 'common/enums'
import {
  ForbiddenError,
  ForbiddenByStateError,
  UserInputError,
} from 'common/errors'
import { MomentService, UserService, SystemService } from 'connectors'

import { genConnections, closeConnections } from './utils'

let connections: Connections
let momentService: MomentService
let userService: UserService
let systemService: SystemService

beforeAll(async () => {
  connections = await genConnections()
  momentService = new MomentService(connections)
  userService = new UserService(connections)
  systemService = new SystemService(connections)
}, 30000)

afterAll(async () => {
  await closeConnections(connections)
})

describe('create moments', () => {
  const user = { id: '1', state: USER_STATE.active, userName: 'testuser' }
  const data = { content: 'test', assetIds: [] }
  test('not active user will fail', async () => {
    const bannedUser = {
      id: '1',
      state: USER_STATE.banned,
      userName: 'testuser',
    }
    expect(momentService.create(data, bannedUser)).rejects.toThrowError(
      ForbiddenByStateError
    )
  })
  test('content length is checked', async () => {
    expect(
      momentService.create({ content: 'a'.repeat(MAX_MOMENT_LENGTH + 1) }, user)
    ).rejects.toThrowError(UserInputError)
    expect(
      momentService.create({ content: 'a'.repeat(MAX_MOMENT_LENGTH) }, user)
    ).resolves.toBeDefined()
  })
  test('assets are checked', async () => {
    // wrong author
    expect(
      momentService.create({ content: 'test', assetIds: ['2'] }, user)
    ).rejects.toThrowError(UserInputError)
    // wrong type
    expect(
      momentService.create({ content: 'test', assetIds: ['1'] }, user)
    ).rejects.toThrowError(UserInputError)

    const asset = await systemService.findAssetOrCreateByPath(
      {
        uuid: v4(),
        authorId: user.id,
        type: IMAGE_ASSET_TYPE.moment,
        path: 'test.jpg',
      },
      '1',
      '1'
    )
    expect(
      momentService.create({ content: 'test', assetIds: [asset.id] }, user)
    ).resolves.toBeDefined()
  })
  test('active user will success', async () => {
    const moment = await momentService.create(data, user)
    expect(moment).toBeDefined()
    expect(moment.content).toBe('<p>test</p>')
  })
})

describe('delete moments', () => {
  test('not active/banned user will fail', async () => {
    const user = { id: '1', state: USER_STATE.archived }
    const moment = await momentService.create(
      { content: 'test', assetIds: [] },
      { id: user.id, state: USER_STATE.active, userName: 'testuser' }
    )
    expect(momentService.delete(moment.id, user)).rejects.toThrowError(
      ForbiddenByStateError
    )
  })
  test('not author will fail', async () => {
    const author = { id: '1', state: USER_STATE.active, userName: 'testuser' }
    const other = { id: '2', state: USER_STATE.active }
    const moment = await momentService.create(
      { content: 'test', assetIds: [] },
      author
    )
    expect(momentService.delete(moment.id, other)).rejects.toThrowError(
      ForbiddenError
    )
  })
  test('author will success', async () => {
    const author = { id: '1', state: USER_STATE.active, userName: 'testuser' }
    const moment = await momentService.create(
      { content: 'test', assetIds: [] },
      author
    )
    const updated = await momentService.delete(moment.id, author)
    expect(updated.state).toBe(MOMENT_STATE.archived)
  })
})

describe('like/unklike moments', () => {
  test('not active user will fail', async () => {
    const user = { id: '1', state: USER_STATE.banned }
    const moment = await momentService.create(
      { content: 'test', assetIds: [] },
      { id: '2', state: USER_STATE.active, userName: 'testuser' }
    )
    expect(momentService.like(moment.id, user)).rejects.toThrowError(
      ForbiddenByStateError
    )
  })
  test('author will fail', async () => {
    const author = { id: '1', state: USER_STATE.active }
    const moment = await momentService.create(
      { content: 'test', assetIds: [] },
      { id: author.id, state: USER_STATE.active, userName: 'testuser' }
    )
    expect(momentService.like(moment.id, author)).rejects.toThrowError(
      ForbiddenError
    )
  })
  test('archived moment will fail', async () => {
    const user = { id: '1', state: USER_STATE.active }
    const moment = await momentService.create(
      { content: 'test', assetIds: [] },
      { id: '2', state: USER_STATE.active, userName: 'testuser' }
    )
    await momentService.delete(moment.id, {
      id: '2',
      state: USER_STATE.active,
    })
    expect(momentService.like(moment.id, user)).rejects.toThrowError(
      UserInputError
    )
  })
  test('success', async () => {
    const user = { id: '1', state: USER_STATE.active }
    const moment = await momentService.create(
      { content: 'test', assetIds: [] },
      { id: '2', state: USER_STATE.active, userName: 'testuser' }
    )
    expect(momentService.isLiked(moment.id, user.id)).resolves.toBe(false)
    await momentService.like(moment.id, user)
    expect(momentService.isLiked(moment.id, user.id)).resolves.toBe(true)

    // like multiple times is idempotent
    await momentService.like(moment.id, user)
    expect(momentService.isLiked(moment.id, user.id)).resolves.toBe(true)

    // unlike multiple times is idempotent
    await momentService.unlike(moment.id, user)
    expect(momentService.isLiked(moment.id, user.id)).resolves.toBe(false)
    await momentService.unlike(moment.id, user)
    expect(momentService.isLiked(moment.id, user.id)).resolves.toBe(false)
  })
  test('count likes', async () => {
    const moment = await momentService.create(
      { content: 'test', assetIds: [] },
      { id: '1', state: USER_STATE.active, userName: 'testuser' }
    )
    expect(momentService.countLikes(moment.id)).resolves.toBe(0)
    await momentService.like(moment.id, { id: '2', state: USER_STATE.active })
    await momentService.like(moment.id, { id: '2', state: USER_STATE.active })
    expect(momentService.countLikes(moment.id)).resolves.toBe(1)
  })
  test('blocked user will fail', async () => {
    const user = { id: '3', state: USER_STATE.active }
    const author = { id: '4', state: USER_STATE.active, userName: 'testuser' }
    const moment = await momentService.create(
      { content: 'test', assetIds: [] },
      author
    )
    await userService.block(author.id, user.id)
    expect(momentService.like(moment.id, user)).rejects.toThrowError(
      ForbiddenError
    )
  })
})
