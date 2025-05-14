import type { Connections } from '#definitions/index.js'

import { v4 } from 'uuid'

import {
  NODE_TYPES,
  COMMENT_TYPE,
  COMMENT_STATE,
  FEATURE_FLAG,
  FEATURE_NAME,
  ASSET_TYPE,
} from '#common/enums/index.js'
import { AssetNotFoundError } from '#common/errors.js'
import {
  SystemService,
  AtomService,
  MomentService,
  ChannelService,
} from '#connectors/index.js'

import { genConnections, closeConnections } from './utils.js'

const assetValidation = {
  id: expect.any(String),
  uuid: expect.any(String),
  authorId: expect.any(String),
  type: expect.any(String),
  path: expect.any(String),
  createdAt: expect.any(Date),
  updatedAt: expect.any(Date),
}

let connections: Connections
let systemService: SystemService
let atomService: AtomService
let channelService: ChannelService
beforeAll(async () => {
  connections = await genConnections()
  systemService = new SystemService(connections)
  atomService = new AtomService(connections)
  channelService = new ChannelService(connections)
}, 30000)

afterAll(async () => {
  await closeConnections(connections)
})

test('findAssetByUUIDs', async () => {
  const existUUID = '00000000-0000-0000-0000-000000000001'
  const notExistUUID = v4()
  const assets = await systemService.findAssetByUUIDs([existUUID, notExistUUID])
  expect((assets[0] as any).uuid).toEqual(existUUID)
  expect(assets[1]).toBeUndefined()
})

test('findAssetUrl', async () => {
  // image assets return cloudflare url
  const imageUrl = await systemService.findAssetUrl('1')
  expect(imageUrl).toContain('https://imagedelivery.net')

  // not-image assets return s3 url
  const notImageUrl = await systemService.findAssetUrl('7')
  expect(notImageUrl).toContain(systemService.aws.getS3Endpoint())
})

test('create and delete asset', async () => {
  const data = {
    uuid: v4(),
    authorId: '1',
    type: 'cover',
    path: 'path/to/file.txt',
  }
  const asset = await atomService.create({ table: 'asset', data })
  expect(asset).toEqual(expect.objectContaining(assetValidation))

  await systemService.baseDelete(asset.id, 'asset')
  const result = await atomService.findUnique({
    table: 'asset',
    where: { id: asset.id },
  })
  expect(result).toBeUndefined()
})

test('copy asset map', async () => {
  const data = {
    uuid: v4(),
    authorId: '1',
    type: 'cover',
    path: 'path/to/file.txt',
  }
  const draftEntityTypeId = '13'
  const articleEntityTypeId = '4'
  await systemService.createAssetAndAssetMap(data, draftEntityTypeId, '1')
  const source = {
    entityTypeId: draftEntityTypeId,
    entityId: '1',
  }
  const target = {
    entityTypeId: articleEntityTypeId,
    entityId: '1',
  }
  // should not throw errors
  await systemService.copyAssetMapEntities({ source, target })
})

describe('report', () => {
  test('submit report', async () => {
    const report = await systemService.submitReport({
      targetType: NODE_TYPES.Article,
      targetId: '1',
      reporterId: '1',
      reason: 'other',
    })
    expect(report.id).toBeDefined()
    expect(report.articleId).not.toBeNull()
    expect(report.commentId).toBeNull()
  })
  test('submit report on moments', async () => {
    const momentService = new MomentService(connections)
    const moment = await momentService.create(
      { content: 'test', assetIds: [] },
      { id: '1', state: 'active', userName: 'test' }
    )
    const report = await systemService.submitReport({
      targetType: NODE_TYPES.Moment,
      targetId: moment.id,
      reporterId: '1',
      reason: 'other',
    })
    expect(report.id).toBeDefined()
    expect(report.momentId).not.toBeNull()
    expect(report.commentId).toBeNull()
    expect(report.articleId).toBeNull()
  })
  test('collapse comment if more than 3 different users report it', async () => {
    const commentId = '1'
    const comment = await atomService.findUnique({
      table: 'comment',
      where: { id: commentId },
    })
    expect(comment.type).toBe(COMMENT_TYPE.article)
    expect(comment.state).toBe(COMMENT_STATE.active)

    // only 2 reports, comment should not be collapsed

    await systemService.submitReport({
      targetType: NODE_TYPES.Comment,
      targetId: commentId,
      reporterId: '2',
      reason: 'other',
    })
    await systemService.submitReport({
      targetType: NODE_TYPES.Comment,
      targetId: commentId,
      reporterId: '3',
      reason: 'other',
    })

    const commentAfter2Reports = await atomService.findUnique({
      table: 'comment',
      where: { id: commentId },
    })
    expect(commentAfter2Reports.state).toBe(COMMENT_STATE.active)

    // only 3 reports from 2 different users, comment should not be collapsed

    await systemService.submitReport({
      targetType: NODE_TYPES.Comment,
      targetId: commentId,
      reporterId: '3',
      reason: 'other',
    })

    const commentAfter3Reports = await atomService.findUnique({
      table: 'comment',
      where: { id: commentId },
    })
    expect(commentAfter3Reports.state).toBe(COMMENT_STATE.active)

    // 4 reports from 3 different users, comment should be collapsed

    await systemService.submitReport({
      targetType: NODE_TYPES.Comment,
      targetId: commentId,
      reporterId: '4',
      reason: 'other',
    })

    const commentAfter4Reports = await atomService.findUnique({
      table: 'comment',
      where: { id: commentId },
    })
    expect(commentAfter4Reports.state).toBe(COMMENT_STATE.collapsed)
  })

  test('collapse comment if article author report it', async () => {
    const commentId = '2'
    const comment = await atomService.findUnique({
      table: 'comment',
      where: { id: commentId },
    })
    expect(comment.type).toBe(COMMENT_TYPE.article)
    expect(comment.state).toBe(COMMENT_STATE.active)

    const { authorId } = await atomService.findUnique({
      table: 'article',
      where: { id: comment.targetId },
    })

    await systemService.submitReport({
      targetType: NODE_TYPES.Comment,
      targetId: commentId,
      reporterId: authorId,
      reason: 'other',
    })

    const commentAfterReport = await atomService.findUnique({
      table: 'comment',
      where: { id: commentId },
    })

    expect(commentAfterReport.state).toBe(COMMENT_STATE.collapsed)
  })
})

test('setFeature', async () => {
  const updated1 = await systemService.setFeatureFlag({
    name: FEATURE_NAME.payment,
    flag: FEATURE_FLAG.off,
  })
  expect(updated1.name).toBe(FEATURE_NAME.payment)
  expect(updated1.flag).toBe(FEATURE_FLAG.off)
  expect(updated1.value).toBeNull()

  const updated2 = await systemService.setFeatureFlag({
    name: FEATURE_NAME.spam_detection,
    flag: FEATURE_FLAG.on,
    value: 0.5,
  })
  expect(updated2.name).toBe(FEATURE_NAME.spam_detection)
  expect(updated2.flag).toBe(FEATURE_FLAG.on)
  expect(updated2.value).toBe(0.5)
})

test('get spam threshold', async () => {
  const threshold = await systemService.getSpamThreshold()
  expect(threshold).toBe(0.5)
})

describe('announcement', () => {
  beforeEach(async () => {
    await atomService.deleteMany({ table: 'channel_announcement' })
    await atomService.deleteMany({ table: 'announcement' })
  })
  const createAnnouncement = async ({
    expiredAt,
    visible,
  }: { expiredAt?: Date; visible?: boolean } = {}) => {
    return await atomService.create({
      table: 'announcement',
      data: {
        title: 'test',
        content: 'test',
        link: 'https://example.com',
        visible: visible ?? true,
        order: 1,
        type: 'product',
        expiredAt: expiredAt ?? null,
      },
    })
  }
  test('findAnnouncement by id', async () => {
    // return null if announcement not found
    const announcement0 = await systemService.findAnnouncement({
      id: '1',
    })
    expect(announcement0).toBeNull()

    // return announcement if found
    const createdAnnouncement = await createAnnouncement()

    const announcement1 = await systemService.findAnnouncement({
      id: createdAnnouncement.id,
    })
    expect(announcement1).toBeDefined()
    expect(announcement1?.id).toBe(createdAnnouncement.id)
  })

  test('findAnnouncement with visibility filter', async () => {
    const createdAnnouncement = await createAnnouncement()
    const visibleAnnouncement = await systemService.findAnnouncement({
      id: createdAnnouncement.id,
      visible: true,
    })
    expect(visibleAnnouncement).toBeDefined()
    expect(visibleAnnouncement?.visible).toBe(true)

    const invisibleAnnouncement = await systemService.findAnnouncement({
      id: createdAnnouncement.id,
      visible: false,
    })
    expect(invisibleAnnouncement).toBeNull()
  })

  test('findAnnouncement with expired announcement', async () => {
    // Create an expired announcement
    const expiredAnnouncement = await createAnnouncement({
      expiredAt: new Date(Date.now() - 1000),
    })

    const result = await systemService.findAnnouncement({
      id: expiredAnnouncement.id,
    })
    expect(result).toBeNull()
  })

  test('findAnnouncements without filters', async () => {
    const createdAnnouncement = await createAnnouncement()
    const announcements = await systemService.findAnnouncements({})
    expect(Array.isArray(announcements)).toBe(true)
    expect(announcements.length).toBe(1)
    expect(announcements[0].id).toBe(createdAnnouncement.id)
  })

  test('findAnnouncements with channel filter', async () => {
    const createdAnnouncement = await createAnnouncement({ visible: false })
    const channel = await channelService.createTopicChannel({
      name: 'test',
      providerId: 'test',
      enabled: true,
    })

    const announcements1 = await systemService.findAnnouncements({
      channelId: channel.id,
    })
    expect(announcements1.length).toBe(0)

    // Verify all announcements are associated with the channel
    const channelAnnouncement = await atomService.create({
      table: 'channel_announcement',
      data: {
        channelId: channel.id,
        announcementId: createdAnnouncement.id,
        visible: false,
      },
    })

    const announcements2 = await systemService.findAnnouncements({
      channelId: channel.id,
    })
    expect(announcements2.length).toBe(1)
    expect(announcements2[0].id).toBe(createdAnnouncement.id)

    const announcements3 = await systemService.findAnnouncements({
      channelId: channel.id,
      visible: true,
    })
    expect(announcements3.length).toBe(0)

    await atomService.update({
      table: 'channel_announcement',
      where: {
        id: channelAnnouncement.id,
      },
      data: { visible: true },
    })

    const announcements4 = await systemService.findAnnouncements({
      channelId: channel.id,
      visible: true,
    })
    expect(announcements4.length).toBe(1)
    expect(announcements4[0].id).toBe(createdAnnouncement.id)
  })

  test('findAnnouncements with visibility filter', async () => {
    const visibleAnnouncements = await systemService.findAnnouncements({
      visible: true,
    })
    expect(Array.isArray(visibleAnnouncements)).toBe(true)
    visibleAnnouncements.forEach((announcement) => {
      expect(announcement.visible).toBe(true)
    })

    const invisibleAnnouncements = await systemService.findAnnouncements({
      visible: false,
    })
    expect(Array.isArray(invisibleAnnouncements)).toBe(true)
    invisibleAnnouncements.forEach((announcement) => {
      expect(announcement.visible).toBe(false)
    })
  })
})

describe('validateArticleCover', () => {
  test('validates cover asset successfully', async () => {
    // Create a valid cover asset
    const data = {
      uuid: v4(),
      authorId: '1',
      type: ASSET_TYPE.cover,
      path: 'path/to/cover.jpg',
    }
    const asset = await atomService.create({ table: 'asset', data })

    // Should not throw error for valid cover
    await expect(
      systemService.validateArticleCover({
        coverUUID: asset.uuid,
        userId: '1',
      })
    ).resolves.not.toThrow()
  })

  test('validates embed asset successfully', async () => {
    // Create a valid embed asset
    const data = {
      uuid: v4(),
      authorId: '1',
      type: ASSET_TYPE.embed,
      path: 'path/to/embed.jpg',
    }
    const asset = await atomService.create({ table: 'asset', data })

    // Should not throw error for valid embed
    await expect(
      systemService.validateArticleCover({
        coverUUID: asset.uuid,
        userId: '1',
      })
    ).resolves.not.toThrow()
  })

  test('throws error for non-existent asset', async () => {
    // Should throw error for non-existent asset
    await expect(
      systemService.validateArticleCover({
        coverUUID: v4(),
        userId: '1',
      })
    ).rejects.toThrow(AssetNotFoundError)
  })

  test('throws error for invalid asset type', async () => {
    // Create an asset with invalid type
    const data = {
      uuid: v4(),
      authorId: '1',
      type: ASSET_TYPE.avatar, // Invalid type for article cover
      path: 'path/to/avatar.jpg',
    }
    const asset = await atomService.create({ table: 'asset', data })

    // Should throw error for invalid asset type
    await expect(
      systemService.validateArticleCover({
        coverUUID: asset.uuid,
        userId: '1',
      })
    ).rejects.toThrow(AssetNotFoundError)
  })

  test('throws error for asset owned by different user', async () => {
    // Create an asset owned by user 2
    const data = {
      uuid: v4(),
      authorId: '2',
      type: ASSET_TYPE.cover,
      path: 'path/to/cover.jpg',
    }
    const asset = await atomService.create({ table: 'asset', data })

    // Should throw error when user 1 tries to use user 2's asset
    await expect(
      systemService.validateArticleCover({
        coverUUID: asset.uuid,
        userId: '1',
      })
    ).rejects.toThrow(AssetNotFoundError)
  })
})
