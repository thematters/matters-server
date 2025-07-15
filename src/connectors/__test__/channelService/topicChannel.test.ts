import type { Connections, Article, TopicChannel } from '#definitions/index.js'

import { PublicationService } from '../../article/publicationService.js'
import { AtomService } from '../../atomService.js'
import { ChannelService } from '../../channel/channelService.js'
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
      const result = await channelService.togglePinTopicChannelArticles({
        channelId: topicChannel.id,
        articleIds: [articles[0].id],
        pinned: true,
      })

      expect(result.id).toBe(topicChannel.id)
      expect(result.pinnedArticles).toHaveLength(1)
      expect(result.pinnedArticles).toContain(articles[0].id)
    })

    test('unpins articles', async () => {
      // First pin an article
      await channelService.togglePinTopicChannelArticles({
        channelId: topicChannel.id,
        articleIds: [articles[0].id],
        pinned: true,
      })

      // Then unpin it
      const result = await channelService.togglePinTopicChannelArticles({
        channelId: topicChannel.id,
        articleIds: [articles[0].id],
        pinned: false,
      })

      expect(result.pinnedArticles).toHaveLength(0)
      expect(result.pinnedArticles).not.toContain(articles[0].id)
    })

    test('automatically unpins oldest articles when exceeding pin limit', async () => {
      // First pin 6 articles (max limit)
      const initialResult = await channelService.togglePinTopicChannelArticles({
        channelId: topicChannel.id,
        articleIds: articleIds.slice(0, 6),
        pinned: true,
      })

      // Verify we have 6 pinned articles
      expect(initialResult.pinnedArticles).toHaveLength(6)

      // Try to pin one more article
      const finalResult = await channelService.togglePinTopicChannelArticles({
        channelId: topicChannel.id,
        articleIds: [articles[6].id],
        pinned: true,
      })

      // Verify we still have only 6 pinned articles (limit enforced)
      expect(finalResult.pinnedArticles).toHaveLength(6)
      expect(finalResult.pinnedArticles).toContain(articles[6].id)

      // The new article should be in the pinned list
      // and the oldest articles should be removed due to the slice(0, TOPIC_CHANNEL_PIN_LIMIT)
    })

    test('pins multiple articles at once', async () => {
      const result = await channelService.togglePinTopicChannelArticles({
        channelId: topicChannel.id,
        articleIds: [articles[0].id, articles[1].id, articles[2].id],
        pinned: true,
      })

      expect(result.pinnedArticles).toHaveLength(3)
      expect(result.pinnedArticles).toContain(articles[0].id)
      expect(result.pinnedArticles).toContain(articles[1].id)
      expect(result.pinnedArticles).toContain(articles[2].id)
    })

    test('unpins multiple articles at once', async () => {
      // First pin multiple articles
      await channelService.togglePinTopicChannelArticles({
        channelId: topicChannel.id,
        articleIds: [articles[0].id, articles[1].id, articles[2].id],
        pinned: true,
      })

      // Then unpin some of them
      const result = await channelService.togglePinTopicChannelArticles({
        channelId: topicChannel.id,
        articleIds: [articles[0].id, articles[2].id],
        pinned: false,
      })

      expect(result.pinnedArticles).toHaveLength(1)
      expect(result.pinnedArticles).toContain(articles[1].id)
      expect(result.pinnedArticles).not.toContain(articles[0].id)
      expect(result.pinnedArticles).not.toContain(articles[2].id)
    })

    test('handles duplicate article IDs when pinning', async () => {
      const result = await channelService.togglePinTopicChannelArticles({
        channelId: topicChannel.id,
        articleIds: [articles[0].id, articles[0].id, articles[1].id],
        pinned: true,
      })

      // Should deduplicate and only pin 2 unique articles
      expect(result.pinnedArticles).toHaveLength(2)
      expect(result.pinnedArticles).toContain(articles[0].id)
      expect(result.pinnedArticles).toContain(articles[1].id)
    })

    test('handles empty article IDs array', async () => {
      const before = await atomService.findUnique({
        table: 'topic_channel',
        where: { id: topicChannel.id },
      })
      const after = await channelService.togglePinTopicChannelArticles({
        channelId: topicChannel.id,
        articleIds: [],
        pinned: true,
      })

      expect(after.pinnedArticles).toEqual(before.pinnedArticles)
    })

    test('respects pin limit when adding to existing pinned articles', async () => {
      // First pin 4 articles
      await channelService.togglePinTopicChannelArticles({
        channelId: topicChannel.id,
        articleIds: articleIds.slice(0, 4),
        pinned: true,
      })

      // Then try to pin 4 more articles (total would be 8, but limit is 6)
      const result = await channelService.togglePinTopicChannelArticles({
        channelId: topicChannel.id,
        articleIds: articleIds.slice(4, 8),
        pinned: true,
      })

      // Should only have 6 articles pinned (the limit)
      expect(result.pinnedArticles).toHaveLength(6)

      // The new articles should be included
      expect(result.pinnedArticles).toContain(articleIds[5])
      expect(result.pinnedArticles).toContain(articleIds[6])
    })
  })

  describe('Error Cases', () => {
    test('throws error for non-existent channel', async () => {
      await expect(
        channelService.togglePinTopicChannelArticles({
          channelId: '999',
          articleIds: [articles[0].id],
          pinned: true,
        })
      ).rejects.toThrow('channel not found')
    })
  })
})
