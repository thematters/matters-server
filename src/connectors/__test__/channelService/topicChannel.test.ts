import type { Connections, Article, TopicChannel } from '#definitions/index.js'
import { NODE_TYPES } from '#common/enums/index.js'

import {
  ChannelService,
  AtomService,
  PublicationService,
} from '#connectors/index.js'
import { genConnections, closeConnections } from '../utils.js'
import { ARTICLE_CHANNEL_JOB_STATE } from '#common/enums/index.js'

import { jest } from '@jest/globals'

let connections: Connections
let channelService: ChannelService
let atomService: AtomService
let publicationService: PublicationService
beforeAll(async () => {
  connections = await genConnections()
  channelService = new ChannelService(connections)
  atomService = new AtomService(connections)
  publicationService = new PublicationService(connections)
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
    const channel = await channelService.createTopicChannel(channelData)

    expect(channel).toBeDefined()
    expect(channel.name).toBe(channelData.name)
    expect(channel.note).toBe(channelData.note)
    expect(channel.providerId).toBe(channelData.providerId)
    expect(channel.enabled).toBe(channelData.enabled)
  })

  test('updates existing channel', async () => {
    const channel = await channelService.createTopicChannel(channelData)
    const updatedData = {
      ...channelData,
      id: channel.id,
      name: 'updated-channel',
      description: 'updated description',
      enabled: false,
    }

    const updatedChannel = await channelService.updateTopicChannel(updatedData)

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

    const channel = await channelService.createTopicChannel(
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
    await atomService.deleteMany({ table: 'topic_channel_article' })
    await atomService.deleteMany({ table: 'topic_channel' })
  })

  test('sets article channels', async () => {
    const channel1 = await channelService.createTopicChannel(channelData)
    const channel2 = await channelService.createTopicChannel({
      ...channelData,
      providerId: '2',
    })

    const channelIds = [channel1.id, channel2.id]
    await channelService.setArticleTopicChannels({
      articleId,
      channelIds,
    })

    const articleChannels = await atomService.findMany({
      table: 'topic_channel_article',
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

  test('sets isSpam to false when adding articles to channels', async () => {
    // First set article as spam
    await atomService.update({
      table: 'article',
      where: { id: articleId },
      data: { isSpam: true },
    })

    const channel = await channelService.createTopicChannel(channelData)
    await channelService.setArticleTopicChannels({
      articleId,
      channelIds: [channel.id],
    })

    // Verify article is no longer marked as spam
    const article = await atomService.findUnique({
      table: 'article',
      where: { id: articleId },
    })
    expect(article.isSpam).toBe(false)
  })

  test('sets isSpam to false when re-adding articles to channels', async () => {
    const channel = await channelService.createTopicChannel(channelData)

    // First add article to channel
    await channelService.setArticleTopicChannels({
      articleId,
      channelIds: [channel.id],
    })

    // Set article as spam
    await atomService.update({
      table: 'article',
      where: { id: articleId },
      data: { isSpam: true },
    })

    // Remove article from channel
    await channelService.setArticleTopicChannels({
      articleId,
      channelIds: [],
    })

    // Re-add article to channel
    await channelService.setArticleTopicChannels({
      articleId,
      channelIds: [channel.id],
    })

    // Verify article is no longer marked as spam
    const article = await atomService.findUnique({
      table: 'article',
      where: { id: articleId },
    })
    expect(article.isSpam).toBe(false)
  })

  test('removes existing channels when setting empty array', async () => {
    const channel = await channelService.createTopicChannel(channelData)
    await channelService.setArticleTopicChannels({
      articleId,
      channelIds: [channel.id],
    })
    await channelService.setArticleTopicChannels({
      articleId,
      channelIds: [],
    })

    const articleChannels = await atomService.findMany({
      table: 'topic_channel_article',
      where: { articleId },
    })
    expect(articleChannels).toHaveLength(1)
    expect(articleChannels[0].channelId).toBe(channel.id)
    expect(articleChannels[0].enabled).toBe(false)
    expect(articleChannels[0].isLabeled).toBe(true)
  })

  test('updates channels when called multiple times', async () => {
    const channel1 = await channelService.createTopicChannel(channelData)
    const channel2 = await channelService.createTopicChannel({
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
      table: 'topic_channel_article',
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
    const channel = await channelService.createTopicChannel(channelData)

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
      table: 'topic_channel_article',
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
      table: 'topic_channel_article',
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

describe('togglePinChannelArticles', () => {
  let topicChannel: TopicChannel
  let articles: Article[]
  const articleIds = ['1', '2', '3', '4', '5', '6', '7']

  beforeEach(async () => {
    // Clean up tables
    await atomService.deleteMany({ table: 'topic_channel_article' })
    await atomService.deleteMany({ table: 'topic_channel' })

    // Create test channels
    topicChannel = await channelService.createTopicChannel({
      name: 'test-topic-channel',
      providerId: 'test-provider-id',
      enabled: true,
    })

    // create more articles
    await publicationService.createArticle({
      title: `Test Article 1`,
      content: `Content for Test Article 1`,
      authorId: '1',
    })

    // Get test articles
    articles = await atomService.findMany({
      table: 'article',
      where: {},
      take: 7,
    })

    expect(articles).toHaveLength(7)

    // Add articles to both channels
    for (const articleId of articleIds) {
      await channelService.setArticleTopicChannels({
        articleId,
        channelIds: [topicChannel.id],
      })
    }
  })

  describe('Topic Channel', () => {
    test('pins articles within limit', async () => {
      const result = await channelService.togglePinChannelArticles({
        channelId: topicChannel.id,
        channelType: NODE_TYPES.TopicChannel,
        articleIds: [articles[0].id],
        pinned: true,
      })

      const pinnedArticles = await atomService.findMany({
        table: 'topic_channel_article',
        where: { channelId: topicChannel.id, pinned: true },
      })

      expect(result.id).toBe(topicChannel.id)
      expect(pinnedArticles).toHaveLength(1)
      expect(pinnedArticles[0].pinnedAt).toBeDefined()
    })

    test('unpins articles', async () => {
      // First pin an article
      await channelService.togglePinChannelArticles({
        channelId: topicChannel.id,
        channelType: NODE_TYPES.TopicChannel,
        articleIds: [articles[0].id],
        pinned: true,
      })

      // Then unpin it
      await channelService.togglePinChannelArticles({
        channelId: topicChannel.id,
        channelType: NODE_TYPES.TopicChannel,
        articleIds: [articles[0].id],
        pinned: false,
      })

      const pinnedArticles = await atomService.findMany({
        table: 'topic_channel_article',
        where: { channelId: topicChannel.id, pinned: true },
      })

      expect(pinnedArticles).toHaveLength(0)
    })

    test('automatically unpins oldest articles when exceeding pin limit', async () => {
      // First pin 6 articles (max limit)
      await channelService.togglePinChannelArticles({
        channelId: topicChannel.id,
        channelType: NODE_TYPES.TopicChannel,
        articleIds: articleIds.slice(0, 6),
        pinned: true,
      })

      // Get initial pinned articles
      const initialPinned = await atomService.findMany({
        table: 'topic_channel_article',
        where: { channelId: topicChannel.id, pinned: true },
      })
      expect(initialPinned).toHaveLength(6)

      // Try to pin one more article
      await channelService.togglePinChannelArticles({
        channelId: topicChannel.id,
        channelType: NODE_TYPES.TopicChannel,
        articleIds: [articles[6].id],
        pinned: true,
      })

      // Verify oldest article was unpinned
      const finalPinned = await atomService.findMany({
        table: 'topic_channel_article',
        where: { channelId: topicChannel.id, pinned: true },
      })
      expect(finalPinned).toHaveLength(6)
      expect(finalPinned.map((a) => a.articleId)).toContain(articles[6].id)
      expect(finalPinned.map((a) => a.articleId)).not.toContain(articles[0].id)
    })
  })

  describe('Error Cases', () => {
    test('throws error for non-existent channel', async () => {
      await expect(
        channelService.togglePinChannelArticles({
          channelId: '999',
          channelType: NODE_TYPES.TopicChannel,
          articleIds: [articles[0].id],
          pinned: true,
        })
      ).rejects.toThrow('channel not found')
    })
  })
})
