import type { Connections } from '#definitions/index.js'

import { jest } from '@jest/globals'
import { v4 } from 'uuid'

import {
  USER_STATE,
  MOMENT_STATE,
  MOMENT_FEED_STATE,
  MOMENT_FEED_REVIEWED_BY,
  MAX_MOMENT_LENGTH,
  IMAGE_ASSET_TYPE,
  NOTICE_TYPE,
} from '#common/enums/index.js'
import {
  ForbiddenError,
  ForbiddenByStateError,
  UserInputError,
} from '#common/errors.js'
import { MomentService } from '../momentService.js'
import { SystemService } from '../systemService.js'
import { TagService } from '../tagService.js'
import { UserService } from '../userService.js'

import { genConnections, closeConnections } from './utils.js'

let connections: Connections
let momentService: MomentService
let userService: UserService
let systemService: SystemService
let tagService: TagService

beforeAll(async () => {
  connections = await genConnections()
  momentService = new MomentService(connections)
  userService = new UserService(connections)
  systemService = new SystemService(connections)
  tagService = new TagService(connections)
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
    expect(momentService.create({ content: '' }, user)).rejects.toThrowError(
      UserInputError
    )
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

    // empty content is allowed when there are assets
    expect(
      momentService.create({ content: '', assetIds: [asset.id] }, user)
    ).resolves.toBeDefined()
  })

  test('active user will success', async () => {
    const moment = await momentService.create(data, user)
    expect(moment).toBeDefined()
    expect(moment.content).toBe('<p>test</p>')
  })

  test('link first tag and article if provided', async () => {
    // ensure a valid tag exists via service
    const tag = await tagService.upsert({
      content: 'MomentServiceTag1',
      creator: user.id,
    })
    const moment = await momentService.create(
      { content: 'with link', tagIds: [tag.id], articleIds: ['1'] },
      user
    )
    expect(moment).toBeDefined()
    const tags = await momentService.getTags(moment.id)
    expect(tags.length).toBe(1)
    expect(tags[0].id).toBe(tag.id)
    const articles = await momentService.getArticles(moment.id)
    // article id 1 exists in seeds and is active
    expect(articles.length).toBe(1)
    expect(articles[0].id).toBe('1')
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
    await expect(momentService.like(moment.id, user)).rejects.toThrowError(
      ForbiddenError
    )
  })
})

describe('findMoments', () => {
  beforeEach(async () => {
    await connections.knex('moment_asset').del()
    await connections.knex('moment_tag').del()
    await connections.knex('moment_article').del()
    await connections.knex('action_moment').del()
    await connections.knex('moment').del()
  })

  test('returns empty array when no moments exist', async () => {
    const moments = await momentService.findMoments()
    expect(moments).toEqual([])
  })

  test('returns all moments when they exist', async () => {
    // Create test moments
    const user1 = { id: '1', state: USER_STATE.active, userName: 'testuser1' }
    const user2 = { id: '2', state: USER_STATE.active, userName: 'testuser2' }

    const moment1 = await momentService.create(
      { content: 'First test moment', assetIds: [] },
      user1
    )
    const moment2 = await momentService.create(
      { content: 'Second test moment', assetIds: [] },
      user2
    )

    const moments = await momentService.findMoments()

    expect(moments).toHaveLength(2)
    expect(moments.map((m) => m.id)).toContain(moment1.id)
    expect(moments.map((m) => m.id)).toContain(moment2.id)
  })

  test('returns moments with correct data structure', async () => {
    const user = { id: '1', state: USER_STATE.active, userName: 'testuser' }
    const moment = await momentService.create(
      { content: 'Test moment content', assetIds: [] },
      user
    )

    const moments = await momentService.findMoments()
    const foundMoment = moments.find((m) => m.id === moment.id)

    expect(foundMoment).toBeDefined()
    expect(foundMoment).toHaveProperty('id')
    expect(foundMoment).toHaveProperty('shortHash')
    expect(foundMoment).toHaveProperty('authorId')
    expect(foundMoment).toHaveProperty('content')
    expect(foundMoment).toHaveProperty('state')
    expect(foundMoment).toHaveProperty('createdAt')
    expect(foundMoment).toHaveProperty('updatedAt')
    expect(foundMoment?.authorId).toBe(user.id)
    expect(foundMoment?.content).toBe('<p>Test moment content</p>')
    expect(foundMoment?.state).toBe(MOMENT_STATE.active)
  })
})

describe('moment feed: applyMomentFeed', () => {
  test('non-active user is rejected', async () => {
    const user = await userService.create()
    await expect(
      momentService.applyMomentFeed({ id: user.id, state: USER_STATE.banned })
    ).rejects.toThrowError(ForbiddenByStateError)
  })

  test('creates a pending application', async () => {
    const user = await userService.create()
    const record = await momentService.applyMomentFeed({
      id: user.id,
      state: USER_STATE.active,
    })
    expect(record.state).toBe(MOMENT_FEED_STATE.pending)
    expect(record.reviewedBy).toBeNull()
    expect(record.reviewerId).toBeNull()
  })

  test('duplicate application is rejected', async () => {
    const user = await userService.create()
    await momentService.applyMomentFeed({
      id: user.id,
      state: USER_STATE.active,
    })
    await expect(
      momentService.applyMomentFeed({ id: user.id, state: USER_STATE.active })
    ).rejects.toThrowError(UserInputError)
  })
})

describe('moment feed: reviewMomentFeedApplication', () => {
  const seedApplication = async (state: string) => {
    const user = await userService.create()
    await connections
      .knex('moment_feed_user')
      .insert({ userId: user.id, state })
    return user
  }

  test('not found throws', async () => {
    const admin = await userService.create()
    await expect(
      momentService.reviewMomentFeedApplication({
        userId: '0',
        state: MOMENT_FEED_STATE.approved,
        reviewerId: admin.id,
      })
    ).rejects.toThrowError(UserInputError)
  })

  test('pending to approved sets reviewer', async () => {
    const admin = await userService.create()
    const user = await seedApplication(MOMENT_FEED_STATE.pending)
    const record = await momentService.reviewMomentFeedApplication({
      userId: user.id,
      state: MOMENT_FEED_STATE.approved,
      reviewerId: admin.id,
    })
    expect(record.state).toBe(MOMENT_FEED_STATE.approved)
    expect(record.reviewedBy).toBe(MOMENT_FEED_REVIEWED_BY.admin)
    expect(record.reviewerId).toBe(admin.id)
  })

  test('invalid transition pending to revoked throws', async () => {
    const admin = await userService.create()
    const user = await seedApplication(MOMENT_FEED_STATE.pending)
    await expect(
      momentService.reviewMomentFeedApplication({
        userId: user.id,
        state: MOMENT_FEED_STATE.revoked,
        reviewerId: admin.id,
      })
    ).rejects.toThrowError(UserInputError)
  })

  test('approved to revoked is allowed', async () => {
    const admin = await userService.create()
    const user = await seedApplication(MOMENT_FEED_STATE.approved)
    const record = await momentService.reviewMomentFeedApplication({
      userId: user.id,
      state: MOMENT_FEED_STATE.revoked,
      reviewerId: admin.id,
    })
    expect(record.state).toBe(MOMENT_FEED_STATE.revoked)
  })
})

describe('moment feed: autoApproveExpiredMomentFeedApplications', () => {
  test('approves expired pending and skips fresh ones', async () => {
    const oldUser = await userService.create()
    const freshUser = await userService.create()
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
    await connections.knex('moment_feed_user').insert({
      userId: oldUser.id,
      state: MOMENT_FEED_STATE.pending,
      createdAt: threeDaysAgo,
    })
    await connections.knex('moment_feed_user').insert({
      userId: freshUser.id,
      state: MOMENT_FEED_STATE.pending,
    })

    await momentService.autoApproveExpiredMomentFeedApplications({
      expireHours: 48,
    })

    const oldRow = await connections
      .knex('moment_feed_user')
      .where({ userId: oldUser.id })
      .first()
    const freshRow = await connections
      .knex('moment_feed_user')
      .where({ userId: freshUser.id })
      .first()
    expect(oldRow.state).toBe(MOMENT_FEED_STATE.approved)
    expect(oldRow.reviewedBy).toBe(MOMENT_FEED_REVIEWED_BY.system)
    expect(oldRow.reviewerId).toBeNull()
    expect(freshRow.state).toBe(MOMENT_FEED_STATE.pending)
  })
})

describe('moment feed: approval notification', () => {
  const seedApplication = async (state: string) => {
    const user = await userService.create()
    await connections
      .knex('moment_feed_user')
      .insert({ userId: user.id, state })
    return user
  }

  test('admin approve (into approved) triggers notification', async () => {
    const admin = await userService.create()
    const user = await seedApplication(MOMENT_FEED_STATE.pending)
    const triggerSpy = jest.spyOn(momentService.notificationService, 'trigger')

    await momentService.reviewMomentFeedApplication({
      userId: user.id,
      state: MOMENT_FEED_STATE.approved,
      reviewerId: admin.id,
    })

    expect(triggerSpy).toHaveBeenCalledWith({
      event: NOTICE_TYPE.moment_feed_approved,
      recipientId: user.id,
    })
    triggerSpy.mockRestore()
  })

  test('admin re-approve (revoked to approved) triggers notification', async () => {
    const admin = await userService.create()
    const user = await seedApplication(MOMENT_FEED_STATE.revoked)
    const triggerSpy = jest.spyOn(momentService.notificationService, 'trigger')

    await momentService.reviewMomentFeedApplication({
      userId: user.id,
      state: MOMENT_FEED_STATE.approved,
      reviewerId: admin.id,
    })

    expect(triggerSpy).toHaveBeenCalledWith({
      event: NOTICE_TYPE.moment_feed_approved,
      recipientId: user.id,
    })
    triggerSpy.mockRestore()
  })

  test('admin re-approve (approved to approved) does not trigger', async () => {
    const admin = await userService.create()
    const user = await seedApplication(MOMENT_FEED_STATE.approved)
    const triggerSpy = jest.spyOn(momentService.notificationService, 'trigger')

    await momentService.reviewMomentFeedApplication({
      userId: user.id,
      state: MOMENT_FEED_STATE.approved,
      reviewerId: admin.id,
    })

    expect(triggerSpy).not.toHaveBeenCalled()
    triggerSpy.mockRestore()
  })

  test('admin reject does not trigger', async () => {
    const admin = await userService.create()
    const user = await seedApplication(MOMENT_FEED_STATE.pending)
    const triggerSpy = jest.spyOn(momentService.notificationService, 'trigger')

    await momentService.reviewMomentFeedApplication({
      userId: user.id,
      state: MOMENT_FEED_STATE.rejected,
      reviewerId: admin.id,
    })

    expect(triggerSpy).not.toHaveBeenCalled()
    triggerSpy.mockRestore()
  })

  test('auto approve triggers notification for the approved user', async () => {
    const user = await userService.create()
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
    await connections.knex('moment_feed_user').insert({
      userId: user.id,
      state: MOMENT_FEED_STATE.pending,
      createdAt: threeDaysAgo,
    })
    const triggerSpy = jest.spyOn(momentService.notificationService, 'trigger')

    await momentService.autoApproveExpiredMomentFeedApplications({
      expireHours: 48,
    })

    expect(triggerSpy).toHaveBeenCalledWith({
      event: NOTICE_TYPE.moment_feed_approved,
      recipientId: user.id,
    })
    triggerSpy.mockRestore()
  })
})
