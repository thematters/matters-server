import type { Connections } from 'definitions'

import { ChannelService, AtomService } from 'connectors'
import { genConnections, closeConnections } from './utils'
import { ARTICLE_CHANNEL_JOB_STATE } from 'common/enums'

let connections: Connections
let channelService: ChannelService
let atomService: AtomService

beforeAll(async () => {
  connections = await genConnections()
  channelService = new ChannelService(connections)
  atomService = new AtomService(connections)
}, 30000)

afterAll(async () => {
  await closeConnections(connections)
})

describe('updateOrCreateChannel', () => {
  const channelData = {
    name: 'test-channel',
    description: 'test description',
    providerId: '1',
    enabled: true,
  }

  beforeEach(async () => {
    await atomService.deleteMany({ table: 'channel' })
  })

  test('creates new channel', async () => {
    const channel = await channelService.updateOrCreateChannel(channelData)

    expect(channel).toBeDefined()
    expect(channel.name).toBe(channelData.name)
    expect(channel.description).toBe(channelData.description)
    expect(channel.providerId).toBe(channelData.providerId)
    expect(channel.enabled).toBe(channelData.enabled)
  })

  test('updates existing channel', async () => {
    const channel = await channelService.updateOrCreateChannel(channelData)
    const updatedData = {
      ...channelData,
      id: channel.id,
      name: 'updated-channel',
      description: 'updated description',
      enabled: false,
    }

    const updatedChannel = await channelService.updateOrCreateChannel(
      updatedData
    )

    expect(updatedChannel.id).toBe(channel.id)
    expect(updatedChannel.name).toBe(updatedData.name)
    expect(updatedChannel.description).toBe(updatedData.description)
    expect(updatedChannel.enabled).toBe(updatedData.enabled)
    expect(updatedChannel.updatedAt).toBeDefined()
  })

  test('handles optional description', async () => {
    const dataWithoutDescription = {
      name: 'no-description',
      providerId: '1',
      enabled: true,
    }

    const channel = await channelService.updateOrCreateChannel(
      dataWithoutDescription
    )

    expect(channel).toBeDefined()
    expect(channel.name).toBe(dataWithoutDescription.name)
    expect(channel.description).toBeNull()
  })
})

describe('setArticleChannels', () => {
  const articleId = '1'
  const channelData = {
    name: 'test-channel',
    description: 'test description',
    providerId: '1',
    enabled: true,
  }

  beforeEach(async () => {
    await atomService.deleteMany({ table: 'article_channel' })
    await atomService.deleteMany({ table: 'channel' })
  })

  test('sets article channels', async () => {
    const channel1 = await channelService.updateOrCreateChannel(channelData)
    const channel2 = await channelService.updateOrCreateChannel({
      ...channelData,
      providerId: '2',
    })

    const channelIds = [channel1.id, channel2.id]
    await channelService.setArticleChannels({
      articleId,
      channelIds,
    })

    const articleChannels = await atomService.findMany({
      table: 'article_channel',
      where: { articleId },
    })
    expect(articleChannels).toHaveLength(2)
    expect(articleChannels.map((c) => c.channelId)).toEqual(
      expect.arrayContaining(channelIds)
    )
    expect(articleChannels[0].enabled).toBe(true)
    expect(articleChannels[0].isLabeled).toBe(true)
    expect(articleChannels[0].isByModel).toBe(false)
    expect(articleChannels[1].enabled).toBe(true)
    expect(articleChannels[1].isLabeled).toBe(true)
    expect(articleChannels[1].isByModel).toBe(false)
  })

  test('removes existing channels when setting empty array', async () => {
    const channel = await channelService.updateOrCreateChannel(channelData)
    await channelService.setArticleChannels({
      articleId,
      channelIds: [channel.id],
    })
    await channelService.setArticleChannels({
      articleId,
      channelIds: [],
    })

    const articleChannels = await atomService.findMany({
      table: 'article_channel',
      where: { articleId },
    })
    expect(articleChannels).toHaveLength(1)
    expect(articleChannels[0].channelId).toBe(channel.id)
    expect(articleChannels[0].enabled).toBe(false)
    expect(articleChannels[0].isLabeled).toBe(true)
    expect(articleChannels[0].isByModel).toBe(false)
  })

  test('updates channels when called multiple times', async () => {
    const channel1 = await channelService.updateOrCreateChannel(channelData)
    const channel2 = await channelService.updateOrCreateChannel({
      ...channelData,
      name: 'test-channel-2',
      providerId: '2',
    })
    await channelService.setArticleChannels({
      articleId,
      channelIds: [channel1.id],
    })
    await channelService.setArticleChannels({
      articleId,
      channelIds: [channel2.id],
    })

    const articleChannels = await atomService.findMany({
      table: 'article_channel',
      where: { articleId },
    })
    expect(articleChannels).toHaveLength(2)

    expect(articleChannels[0].channelId).toBe(channel2.id)
    expect(articleChannels[0].enabled).toBe(true)
    expect(articleChannels[0].isLabeled).toBe(true)

    expect(articleChannels[1].channelId).toBe(channel1.id)
    expect(articleChannels[1].enabled).toBe(false) // turns into false
    expect(articleChannels[1].isLabeled).toBe(true)
  })

  test('re-enables disabled channels when added again', async () => {
    const channel = await channelService.updateOrCreateChannel(channelData)

    // First add and then remove the channel
    await channelService.setArticleChannels({
      articleId,
      channelIds: [channel.id],
    })
    await channelService.setArticleChannels({
      articleId,
      channelIds: [],
    })

    // Verify channel is disabled
    let articleChannels = await atomService.findMany({
      table: 'article_channel',
      where: { articleId },
    })
    expect(articleChannels[0].enabled).toBe(false)

    // Re-add the channel
    await channelService.setArticleChannels({
      articleId,
      channelIds: [channel.id],
    })

    // Verify channel is re-enabled
    articleChannels = await atomService.findMany({
      table: 'article_channel',
      where: { articleId },
    })
    expect(articleChannels[0].enabled).toBe(true)
  })

  test('sets isByModel correctly for new and re-enabled channels', async () => {
    const channel1 = await channelService.updateOrCreateChannel(channelData)
    const channel2 = await channelService.updateOrCreateChannel({
      ...channelData,
      name: 'Test Channel 2',
      providerId: 'test-channel-2',
    })

    // First, manually add channel1 with isByModel = true to simulate a channel added by model
    await atomService.create({
      table: 'article_channel',
      data: {
        articleId,
        channelId: channel1.id,
        enabled: true,
        isLabeled: false,
        isByModel: true,
      },
    })

    // Then disable channel1 by setting empty array
    await channelService.setArticleChannels({
      articleId,
      channelIds: [],
    })

    // Now add channel1 (re-enable) and channel2 (new)
    await channelService.setArticleChannels({
      articleId,
      channelIds: [channel1.id, channel2.id],
    })

    let articleChannels = await atomService.findMany({
      table: 'article_channel',
      where: { articleId },
      orderBy: [{ column: 'id', order: 'asc' }],
    })

    expect(articleChannels).toHaveLength(2)

    console.log(articleChannels[0], channel2, channel1)

    // channel1 should have isByModel = true since it's a record added by model
    expect(articleChannels[0]).toBeDefined()
    expect(articleChannels[0]?.enabled).toBe(true)
    expect(articleChannels[0]?.isByModel).toBe(true)

    // channel2 should have isByModel = false since it's a new record
    expect(articleChannels[1]).toBeDefined()
    expect(articleChannels[1]?.enabled).toBe(true)
    expect(articleChannels[1]?.isByModel).toBe(false)
  })
})

describe('channel classifier', () => {
  test('classify article channels', async () => {
    const articleId = '1'

    const providerChannelId = '1'
    const response = [
      {
        state: ARTICLE_CHANNEL_JOB_STATE.finished,
        jobId: '1',
        channels: [{ channel: providerChannelId, score: 0.99 }],
      },
    ]
    const mockClassifier = { classify: jest.fn(() => response) }
    // @ts-ignore
    const result = await channelService._classifyArticlesChannels(
      [{ id: articleId, title: 'test', content: 'test' }],
      mockClassifier as any
    )

    expect(result).toBeDefined()
    expect(result?.[0].state).toBe(ARTICLE_CHANNEL_JOB_STATE.finished)
  })
})
