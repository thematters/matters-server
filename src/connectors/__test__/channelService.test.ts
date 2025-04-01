import type { Connections } from '#definitions/index.js'

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
    await atomService.deleteMany({ table: 'channel' })
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
    expect(articleChannels[1].enabled).toBe(true)
    expect(articleChannels[1].isLabeled).toBe(true)
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
    expect(articleChannels[1].enabled).toBe(false)
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
