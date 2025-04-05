import type {
  Connections,
  CurationChannel,
  Article,
} from '#definitions/index.js'
import {
  CURATION_CHANNEL_COLOR,
  CURATION_CHANNEL_STATE,
} from '#common/enums/index.js'

import {
  ChannelService,
  AtomService,
  CampaignService,
} from '#connectors/index.js'
import { genConnections, closeConnections } from './utils.js'
import { ARTICLE_CHANNEL_JOB_STATE } from '#common/enums/index.js'

import { jest } from '@jest/globals'

let connections: Connections
let channelService: ChannelService
let atomService: AtomService
let campaignService: CampaignService

beforeAll(async () => {
  connections = await genConnections()
  channelService = new ChannelService(connections)
  atomService = new AtomService(connections)
  campaignService = new CampaignService(connections)
}, 30000)

afterAll(async () => {
  await closeConnections(connections)
})

describe('updateOrCreateChannel', () => {
  const channelData = {
    name: 'test-channel',
    note: 'test description',
    providerId: '1',
    enabled: true,
  }

  beforeEach(async () => {
    await atomService.deleteMany({ table: 'topic_channel' })
  })

  test('creates new channel', async () => {
    const channel = await channelService.updateOrCreateChannel(channelData)

    expect(channel).toBeDefined()
    expect(channel.name).toBe(channelData.name)
    expect(channel.note).toBe(channelData.note)
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
    expect(updatedChannel.note).toBe(updatedData.note)
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
    expect(channel.note).toBeNull()
  })
})

describe('setArticleChannels', () => {
  const articleId = '1'
  const channelData = {
    name: 'test-channel',
    note: 'test description',
    providerId: '1',
    enabled: true,
  }

  beforeEach(async () => {
    await atomService.deleteMany({ table: 'article_topic_channel' })
    await atomService.deleteMany({ table: 'topic_channel' })
  })

  test('sets article channels', async () => {
    const channel1 = await channelService.updateOrCreateChannel(channelData)
    const channel2 = await channelService.updateOrCreateChannel({
      ...channelData,
      providerId: '2',
    })

    const channelIds = [channel1.id, channel2.id]
    await channelService.setArticleTopicChannels({
      articleId,
      channelIds,
    })

    const articleChannels = await atomService.findMany({
      table: 'article_topic_channel',
      where: { articleId },
    })
    expect(articleChannels).toHaveLength(2)
    expect(articleChannels.map((c) => c.channelId)).toEqual(
      expect.arrayContaining(channelIds)
    )
    expect(articleChannels[0].enabled).toBe(true)
    expect(articleChannels[0].isLabeled).toBe(true)
    expect(articleChannels[1].enabled).toBe(true)
    expect(articleChannels[1].isLabeled).toBe(true)
  })

  test('removes existing channels when setting empty array', async () => {
    const channel = await channelService.updateOrCreateChannel(channelData)
    await channelService.setArticleTopicChannels({
      articleId,
      channelIds: [channel.id],
    })
    await channelService.setArticleTopicChannels({
      articleId,
      channelIds: [],
    })

    const articleChannels = await atomService.findMany({
      table: 'article_topic_channel',
      where: { articleId },
    })
    expect(articleChannels).toHaveLength(1)
    expect(articleChannels[0].channelId).toBe(channel.id)
    expect(articleChannels[0].enabled).toBe(false)
    expect(articleChannels[0].isLabeled).toBe(true)
  })

  test('updates channels when called multiple times', async () => {
    const channel1 = await channelService.updateOrCreateChannel(channelData)
    const channel2 = await channelService.updateOrCreateChannel({
      ...channelData,
      name: 'test-channel-2',
      providerId: '2',
    })
    await channelService.setArticleTopicChannels({
      articleId,
      channelIds: [channel1.id],
    })
    await channelService.setArticleTopicChannels({
      articleId,
      channelIds: [channel2.id],
    })

    const articleChannels = await atomService.findMany({
      table: 'article_topic_channel',
      where: { articleId },
    })
    expect(articleChannels).toHaveLength(2)

    expect(articleChannels[0].channelId).toBe(channel2.id)
    expect(articleChannels[0].enabled).toBe(true)
    expect(articleChannels[0].isLabeled).toBe(true)

    expect(articleChannels[1].channelId).toBe(channel1.id)
    expect(articleChannels[1].enabled).toBe(false)
    expect(articleChannels[1].isLabeled).toBe(true)
  })

  test('re-enables disabled channels when added again', async () => {
    const channel = await channelService.updateOrCreateChannel(channelData)

    // First add and then remove the channel
    await channelService.setArticleTopicChannels({
      articleId,
      channelIds: [channel.id],
    })
    await channelService.setArticleTopicChannels({
      articleId,
      channelIds: [],
    })

    // Verify channel is disabled
    let articleChannels = await atomService.findMany({
      table: 'article_topic_channel',
      where: { articleId },
    })
    expect(articleChannels[0].enabled).toBe(false)

    // Re-add the channel
    await channelService.setArticleTopicChannels({
      articleId,
      channelIds: [channel.id],
    })

    // Verify channel is re-enabled
    articleChannels = await atomService.findMany({
      table: 'article_topic_channel',
      where: { articleId },
    })
    expect(articleChannels[0].enabled).toBe(true)
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

describe('updateOrCreateCampaignChannel', () => {
  beforeAll(async () => {
    // create campaigns
    const campaignData = {
      name: 'test',
      applicationPeriod: [
        new Date('2010-01-01 11:30'),
        new Date('2010-01-01 15:00'),
      ] as const,
      writingPeriod: [
        new Date('2010-01-01 11:30'),
        new Date('2010-01-05 15:00'),
      ] as const,
      creatorId: '1',
    }
    await campaignService.createWritingChallenge(campaignData)
    await campaignService.createWritingChallenge(campaignData)
    await campaignService.createWritingChallenge(campaignData)
  })

  beforeEach(async () => {
    // Clean up campaign_channel table before each test
    await atomService.deleteMany({ table: 'campaign_channel' })
  })

  test('creates new campaign channel when it does not exist', async () => {
    const campaignId = '1'
    const enabled = true

    const channel = await channelService.updateOrCreateCampaignChannel({
      campaignId,
      enabled,
    })

    expect(channel).toBeDefined()
    expect(channel.campaignId).toBe(campaignId)
    expect(channel.enabled).toBe(enabled)
  })

  test('updates existing campaign channel', async () => {
    const campaignId = '1'

    // First create a disabled channel
    const initialChannel = await channelService.updateOrCreateCampaignChannel({
      campaignId,
      enabled: false,
    })

    // Then update it to enabled
    const updatedChannel = await channelService.updateOrCreateCampaignChannel({
      campaignId,
      enabled: true,
    })

    expect(updatedChannel.id).toBe(initialChannel.id)
    expect(updatedChannel.campaignId).toBe(campaignId)
    expect(updatedChannel.enabled).toBe(true)
  })

  test('disables all other channels when enabling a channel', async () => {
    // Create multiple campaign channels
    const channel1 = await channelService.updateOrCreateCampaignChannel({
      campaignId: '1',
      enabled: true,
    })

    const channel2 = await channelService.updateOrCreateCampaignChannel({
      campaignId: '2',
      enabled: true,
    })

    // Verify channel1 was disabled when channel2 was enabled
    const updatedChannel1 = await atomService.findFirst({
      table: 'campaign_channel',
      where: { campaignId: channel1.campaignId },
    })

    expect(updatedChannel1.enabled).toBe(false)
    expect(channel2.enabled).toBe(true)
  })

  test('does not affect other channels when disabling a channel', async () => {
    // Create an enabled channel
    await channelService.updateOrCreateCampaignChannel({
      campaignId: '1',
      enabled: true,
    })

    // Create another channel as disabled
    await channelService.updateOrCreateCampaignChannel({
      campaignId: '2',
      enabled: false,
    })

    // Verify the first channel remains enabled
    const channel1 = await atomService.findFirst({
      table: 'campaign_channel',
      where: { campaignId: '1' },
    })

    expect(channel1.enabled).toBe(true)
  })

  test('handles multiple enable/disable operations correctly', async () => {
    // Create three channels
    await channelService.updateOrCreateCampaignChannel({
      campaignId: '1',
      enabled: true,
    })

    await channelService.updateOrCreateCampaignChannel({
      campaignId: '2',
      enabled: true,
    })

    await channelService.updateOrCreateCampaignChannel({
      campaignId: '3',
      enabled: true,
    })

    // Verify only the last enabled channel remains enabled
    const allChannels = await atomService.findMany({
      table: 'campaign_channel',
      where: {},
    })

    expect(allChannels).toHaveLength(3)
    expect(allChannels.filter((c) => c.enabled)).toHaveLength(1)
    expect(allChannels.find((c) => c.campaignId === '3')?.enabled).toBe(true)
  })

  test('maintains disabled state when updating disabled channel', async () => {
    // Create a disabled channel
    const channel = await channelService.updateOrCreateCampaignChannel({
      campaignId: '1',
      enabled: false,
    })

    // Update it while keeping it disabled
    const updatedChannel = await channelService.updateOrCreateCampaignChannel({
      campaignId: '1',
      enabled: false,
    })

    expect(updatedChannel.enabled).toBe(false)
    expect(updatedChannel.id).toBe(channel.id)
  })
})

describe('createCurationChannel', () => {
  beforeEach(async () => {
    await atomService.deleteMany({ table: 'curation_channel' })
  })

  test('creates channel with minimal required parameters', async () => {
    const name = 'test-channel'

    const channel = await channelService.createCurationChannel({ name })

    expect(channel).toBeDefined()
    expect(channel.name).toBe(name)
    expect(channel.pinAmount).toBe(3) // default value
    expect(channel.color).toBe(CURATION_CHANNEL_COLOR.gray) // default value
    expect(channel.state).toBe(CURATION_CHANNEL_STATE.editing) // default value
    expect(channel.activePeriod).toBeDefined() // default value should be set
  })

  test('creates channel with all parameters', async () => {
    const channelData = {
      name: 'full-test-channel',
      note: 'test note',
      pinAmount: 5,
      color: CURATION_CHANNEL_COLOR.pink,
      activePeriod: [new Date('2024-01-01'), new Date('2024-12-31')] as const,
      state: CURATION_CHANNEL_STATE.published,
    }

    const channel = await channelService.createCurationChannel(channelData)

    expect(channel).toBeDefined()
    expect(channel.name).toBe(channelData.name)
    expect(channel.note).toBe(channelData.note)
    expect(channel.pinAmount).toBe(channelData.pinAmount)
    expect(channel.color).toBe(channelData.color)
    expect(channel.state).toBe(channelData.state)
    // Check that activePeriod is properly formatted as a datetime range string
    expect(channel.activePeriod).toContain('2024-01-01')
    expect(channel.activePeriod).toContain('2024-12-31')
  })

  test('handles null note', async () => {
    const channel = await channelService.createCurationChannel({
      name: 'no-note-channel',
    })

    expect(channel.note).toBeNull()
  })

  test('creates channel with custom activePeriod', async () => {
    const start = new Date()
    const end = new Date(start.getTime() + 86400000) // +1 day

    const channel = await channelService.createCurationChannel({
      name: 'custom-period-channel',
      activePeriod: [start, end],
    })

    expect(channel.activePeriod).toContain(start.toISOString().split('T')[0])
    expect(channel.activePeriod).toContain(end.toISOString().split('T')[0])
  })
})

describe('updateCurationChannel', () => {
  let existingChannelId: string

  beforeEach(async () => {
    await atomService.deleteMany({ table: 'curation_channel' })
    // Create a channel to update
    const channel = await channelService.createCurationChannel({
      name: 'existing-channel',
      note: 'original note',
      pinAmount: 1,
      color: CURATION_CHANNEL_COLOR.gray,
      state: CURATION_CHANNEL_STATE.editing,
    })
    existingChannelId = channel.id
  })

  test('updates single field', async () => {
    const updatedChannel = await channelService.updateCurationChannel({
      id: existingChannelId,
      name: 'updated-name',
    })

    expect(updatedChannel.name).toBe('updated-name')
    // Other fields should remain unchanged
    expect(updatedChannel.note).toBe('original note')
    expect(updatedChannel.pinAmount).toBe(1)
    expect(updatedChannel.color).toBe(CURATION_CHANNEL_COLOR.gray)
    expect(updatedChannel.state).toBe(CURATION_CHANNEL_STATE.editing)
  })

  test('updates multiple fields', async () => {
    const updates = {
      id: existingChannelId,
      name: 'new-name',
      note: 'new note',
      pinAmount: 10,
      color: CURATION_CHANNEL_COLOR.pink,
      state: CURATION_CHANNEL_STATE.published,
    }

    const updatedChannel = await channelService.updateCurationChannel(updates)

    expect(updatedChannel.name).toBe(updates.name)
    expect(updatedChannel.note).toBe(updates.note)
    expect(updatedChannel.pinAmount).toBe(updates.pinAmount)
    expect(updatedChannel.color).toBe(updates.color)
    expect(updatedChannel.state).toBe(updates.state)
  })

  test('updates activePeriod', async () => {
    const newPeriod = [new Date('2024-06-01'), new Date('2024-12-31')] as const

    const updatedChannel = await channelService.updateCurationChannel({
      id: existingChannelId,
      activePeriod: newPeriod,
    })

    expect(updatedChannel.activePeriod).toContain('2024-06-01')
    expect(updatedChannel.activePeriod).toContain('2024-12-31')
  })

  test('handles null note update', async () => {
    const updatedChannel = await channelService.updateCurationChannel({
      id: existingChannelId,
      note: null,
    })

    expect(updatedChannel.note).toBeNull()
  })

  test('preserves unchanged fields', async () => {
    const originalChannel = await atomService.findFirst({
      table: 'curation_channel',
      where: { id: existingChannelId },
    })

    const updatedChannel = await channelService.updateCurationChannel({
      id: existingChannelId,
      name: 'new-name',
    })

    expect(updatedChannel.note).toBe(originalChannel.note)
    expect(updatedChannel.pinAmount).toBe(originalChannel.pinAmount)
    expect(updatedChannel.color).toBe(originalChannel.color)
    expect(updatedChannel.state).toBe(originalChannel.state)
    expect(updatedChannel.activePeriod).toBe(originalChannel.activePeriod)
  })

  test('handles non-existent channel ID', async () => {
    await expect(
      channelService.updateCurationChannel({
        id: 'non-existent-id',
        name: 'new-name',
      })
    ).rejects.toThrow()
  })
})

describe('addArticlesToCurationChannel', () => {
  let channel: CurationChannel
  const articleIds = ['1', '2', '3']

  beforeEach(async () => {
    await atomService.deleteMany({ table: 'curation_channel_article' })
    await atomService.deleteMany({ table: 'curation_channel' })

    // Create a test channel
    channel = await channelService.createCurationChannel({
      name: 'test-channel',
      pinAmount: 3,
    })
  })

  test('adds new articles to channel', async () => {
    await channelService.addArticlesToCurationChannel({
      channelId: channel.id,
      articleIds,
    })

    const articles = await atomService.findMany({
      table: 'curation_channel_article',
      where: { channelId: channel.id },
    })

    expect(articles).toHaveLength(3)
    expect(articles.map((a) => a.articleId)).toEqual(
      expect.arrayContaining(articleIds)
    )
    expect(articles.every((a) => !a.pinned)).toBe(true)
  })

  test('ignores duplicate articles', async () => {
    // First add some articles
    await channelService.addArticlesToCurationChannel({
      channelId: channel.id,
      articleIds: [articleIds[0]],
    })

    // Try to add the same article again along with new ones
    await channelService.addArticlesToCurationChannel({
      channelId: channel.id,
      articleIds,
    })

    const articles = await atomService.findMany({
      table: 'curation_channel_article',
      where: { channelId: channel.id },
    })

    expect(articles).toHaveLength(3)
    expect(articles.map((a) => a.articleId)).toEqual(
      expect.arrayContaining(articleIds)
    )
  })
})

describe('findCurationChannelArticles', () => {
  let channel: CurationChannel
  let articles: Article[]

  beforeEach(async () => {
    // Clean up tables
    await atomService.deleteMany({ table: 'curation_channel_article' })
    await atomService.deleteMany({ table: 'curation_channel' })

    // Create test channel
    channel = await channelService.createCurationChannel({
      name: 'test-channel',
      pinAmount: 3,
    })

    // Create test articles
    articles = await atomService.findMany({
      table: 'article',
      where: {},
    })
  })

  test('returns empty array when no articles in channel', async () => {
    const results = await channelService
      .findCurationChannelArticles(channel.id)
      .orderBy('order', 'asc')
    expect(results).toHaveLength(0)
  })

  test('orders pinned articles before unpinned articles', async () => {
    // Add articles to channel with different pinned states
    const now = new Date()
    await atomService.create({
      table: 'curation_channel_article',
      data: {
        channelId: channel.id,
        articleId: articles[0].id,
        pinned: true,
        pinnedAt: now,
        createdAt: now,
      },
    })
    await atomService.create({
      table: 'curation_channel_article',
      data: {
        channelId: channel.id,
        articleId: articles[1].id,
        pinned: false,
        createdAt: new Date(now.getTime() + 1000), // created later
      },
    })

    const results = await channelService
      .findCurationChannelArticles(channel.id)
      .orderBy('order', 'asc')
    expect(results).toHaveLength(2)
    expect(results[0].id).toBe(articles[0].id) // Pinned should be first
    expect(results[1].id).toBe(articles[1].id) // Unpinned should be second
  })

  test('orders pinned articles by pinnedAt DESC', async () => {
    const baseTime = new Date()
    // Add multiple pinned articles with different pinnedAt times
    await atomService.create({
      table: 'curation_channel_article',
      data: {
        channelId: channel.id,
        articleId: articles[0].id,
        pinned: true,
        pinnedAt: new Date(baseTime.getTime() + 1000), // Pinned last
        createdAt: baseTime,
      },
    })
    await atomService.create({
      table: 'curation_channel_article',
      data: {
        channelId: channel.id,
        articleId: articles[1].id,
        pinned: true,
        pinnedAt: baseTime, // Pinned first
        createdAt: baseTime,
      },
    })

    const results = await channelService
      .findCurationChannelArticles(channel.id)
      .orderBy('order', 'asc')
    expect(results).toHaveLength(2)
    expect(results[0].id).toBe(articles[0].id) // Most recently pinned
    expect(results[1].id).toBe(articles[1].id) // Pinned earlier
  })

  test('orders unpinned articles by createdAt DESC', async () => {
    const baseTime = new Date()
    // Add multiple unpinned articles with different createdAt times
    await atomService.create({
      table: 'curation_channel_article',
      data: {
        channelId: channel.id,
        articleId: articles[0].id,
        pinned: false,
        createdAt: new Date(baseTime.getTime() + 1000), // Created last
      },
    })
    await atomService.create({
      table: 'curation_channel_article',
      data: {
        channelId: channel.id,
        articleId: articles[1].id,
        pinned: false,
        createdAt: baseTime, // Created first
      },
    })

    const results = await channelService
      .findCurationChannelArticles(channel.id)
      .orderBy('order', 'asc')
    expect(results).toHaveLength(2)
    expect(results[0].id).toBe(articles[0].id) // Most recently created
    expect(results[1].id).toBe(articles[1].id) // Created earlier
  })

  test('returns correct article data with mixed pinned and unpinned articles', async () => {
    const baseTime = new Date()
    // Add a mix of pinned and unpinned articles
    await atomService.create({
      table: 'curation_channel_article',
      data: {
        channelId: channel.id,
        articleId: articles[0].id,
        pinned: true,
        pinnedAt: new Date(baseTime.getTime() + 1000),
        createdAt: baseTime,
      },
    })
    await atomService.create({
      table: 'curation_channel_article',
      data: {
        channelId: channel.id,
        articleId: articles[1].id,
        pinned: true,
        pinnedAt: baseTime,
        createdAt: baseTime,
      },
    })
    await atomService.create({
      table: 'curation_channel_article',
      data: {
        channelId: channel.id,
        articleId: articles[2].id,
        pinned: false,
        createdAt: new Date(baseTime.getTime() + 2000),
      },
    })
    await atomService.create({
      table: 'curation_channel_article',
      data: {
        channelId: channel.id,
        articleId: articles[3].id,
        pinned: false,
        createdAt: baseTime,
      },
    })

    const results = await channelService
      .findCurationChannelArticles(channel.id)
      .orderBy('order', 'asc')
    expect(results).toHaveLength(4)

    // Check order: pinned (by pinnedAt DESC) then unpinned (by createdAt DESC)
    expect(results[0].id).toBe(articles[0].id) // Most recently pinned
    expect(results[1].id).toBe(articles[1].id) // Pinned earlier
    expect(results[2].id).toBe(articles[2].id) // Most recently created unpinned
    expect(results[3].id).toBe(articles[3].id) // Created earlier unpinned
  })

  test('handles non-existent channel ID', async () => {
    const results = await channelService.findCurationChannelArticles('0')
    expect(results).toHaveLength(0)
  })
})
