import type { Connections } from 'definitions'

import { ChannelService, AtomService } from 'connectors'
import { genConnections, closeConnections } from './utils'

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
    await channelService.setArticleChannels(articleId, channelIds)

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
    await channelService.setArticleChannels(articleId, [channel.id])

    await channelService.setArticleChannels(articleId, [])

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

    await channelService.setArticleChannels(articleId, [channel1.id])
    await channelService.setArticleChannels(articleId, [channel2.id])

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
})
