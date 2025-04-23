import type { Connections, Article } from '#definitions/index.js'
import { USER_FEATURE_FLAG_TYPE, NODE_TYPES } from '#common/enums/index.js'

import { ChannelService, AtomService } from '#connectors/index.js'
import { genConnections, closeConnections } from '../utils.js'

let connections: Connections
let channelService: ChannelService
let atomService: AtomService
let channel: any
let articles: Article[]
beforeAll(async () => {
  connections = await genConnections()
  channelService = new ChannelService(connections)
  atomService = new AtomService(connections)
}, 30000)

afterAll(async () => {
  await closeConnections(connections)
})

beforeEach(async () => {
  await atomService.deleteMany({ table: 'topic_channel_article' })
  await atomService.deleteMany({ table: 'topic_channel' })

  channel = await channelService.createTopicChannel({
    name: 'test-channel',
    providerId: 'test-provider-id',
    enabled: true,
  })

  // Get test articles
  articles = await atomService.findMany({
    table: 'article',
    where: {},
    take: 4,
  })

  // Add articles to channel
  await channelService.setArticleTopicChannels({
    articleId: articles[0].id,
    channelIds: [channel.id],
  })
  await channelService.setArticleTopicChannels({
    articleId: articles[1].id,
    channelIds: [channel.id],
  })
  await channelService.setArticleTopicChannels({
    articleId: articles[2].id,
    channelIds: [channel.id],
  })
  await channelService.setArticleTopicChannels({
    articleId: articles[3].id,
    channelIds: [channel.id],
  })
})

describe('findTopicChannelArticles', () => {
  test('returns empty array when no articles in channel', async () => {
    const emptyChannel = await channelService.createTopicChannel({
      providerId: 'test-provider-id-empty',
      name: 'empty-channel',
      enabled: true,
    })

    const results = await channelService.findTopicChannelArticles(
      emptyChannel.id
    )
    expect(results).toHaveLength(0)
  })

  test('orders pinned articles before unpinned articles', async () => {
    // Pin first article
    await channelService.togglePinChannelArticles({
      channelId: channel.id,
      channelType: NODE_TYPES.TopicChannel,
      articleIds: [articles[0].id],
      pinned: true,
    })

    const results = await channelService
      .findTopicChannelArticles(channel.id, { addOrderColumn: true })
      .orderBy('order', 'asc')

    expect(results).toHaveLength(4)
    expect(results[0].id).toBe(articles[0].id) // Pinned should be first
    expect(results[1].id).not.toBe(articles[0].id) // Rest should be unpinned
  })

  test('orders pinned articles by pinnedAt DESC', async () => {
    // Pin two articles at different times
    await channelService.togglePinChannelArticles({
      channelId: channel.id,
      channelType: NODE_TYPES.TopicChannel,
      articleIds: [articles[1].id],
      pinned: true,
    })

    await channelService.togglePinChannelArticles({
      channelId: channel.id,
      channelType: NODE_TYPES.TopicChannel,
      articleIds: [articles[0].id],
      pinned: true,
    })

    const results = await channelService
      .findTopicChannelArticles(channel.id, { addOrderColumn: true })
      .orderBy('order', 'asc')

    expect(results).toHaveLength(4)
    expect(results[0].id).toBe(articles[0].id) // Most recently pinned
    expect(results[1].id).toBe(articles[1].id) // Pinned earlier
  })

  test('orders unpinned articles by created_at DESC', async () => {
    // Update created_at for articles to ensure specific ordering
    const baseTime = new Date()
    await atomService.update({
      table: 'article',
      where: { id: articles[2].id },
      data: { createdAt: new Date(baseTime.getTime() + 1000) },
    })
    await atomService.update({
      table: 'article',
      where: { id: articles[3].id },
      data: { createdAt: baseTime },
    })

    const results = await channelService
      .findTopicChannelArticles(channel.id, { addOrderColumn: true })
      .orderBy('order', 'asc')

    // Find the positions of our test articles in unpinned section
    const article2Index = results.findIndex((a) => a.id === articles[2].id)
    const article3Index = results.findIndex((a) => a.id === articles[3].id)

    expect(article2Index).toBeLessThan(article3Index) // More recent article should come first
  })

  test('applies channel threshold filter correctly', async () => {
    // Set different scores for articles
    await atomService.update({
      table: 'topic_channel_article',
      where: { articleId: articles[0].id, channelId: channel.id },
      data: { score: 0.9, isLabeled: false },
    })
    await atomService.update({
      table: 'topic_channel_article',
      where: { articleId: articles[1].id, channelId: channel.id },
      data: { score: 0.1, isLabeled: false },
    })

    await atomService.update({
      table: 'topic_channel_article',
      where: { articleId: articles[2].id, channelId: channel.id },
      data: { score: 0.9, isLabeled: true },
    })

    await atomService.update({
      table: 'topic_channel_article',
      where: { articleId: articles[3].id, channelId: channel.id },
      data: { score: 0.1, isLabeled: true },
    })

    const results = await channelService.findTopicChannelArticles(channel.id, {
      channelThreshold: 0.5,
    })

    expect(results).toHaveLength(3)
    const resultIds = results.map((a) => a.id)
    for (const id of [articles[0].id, articles[2].id, articles[3].id]) {
      expect(resultIds).toContain(id)
    }
  })

  describe('datetimeRange filtering', () => {
    const baseTime = new Date('2024-01-01T00:00:00Z')
    const oneDayBefore = new Date(baseTime.getTime() - 86400000)
    const oneDayAfter = new Date(baseTime.getTime() + 86400000)
    const twoDaysAfter = new Date(baseTime.getTime() + 172800000)

    beforeEach(async () => {
      await atomService.update({
        table: 'topic_channel_article',
        where: { articleId: articles[0].id, channelId: channel.id },
        data: { createdAt: oneDayBefore, pinned: false }, // 1 day before
      })
      await atomService.update({
        table: 'topic_channel_article',
        where: { articleId: articles[1].id, channelId: channel.id },
        data: { createdAt: baseTime, pinned: false }, // exactly at start
      })
      await atomService.update({
        table: 'topic_channel_article',
        where: { articleId: articles[2].id, channelId: channel.id },
        data: { createdAt: oneDayAfter, pinned: false }, // 1 day after
      })
      await atomService.update({
        table: 'topic_channel_article',
        where: { articleId: articles[3].id, channelId: channel.id },
        data: { createdAt: twoDaysAfter, pinned: false }, // 2 days after
      })
    })

    test('filters articles within date range', async () => {
      const start = baseTime
      const end = oneDayAfter

      const results = await channelService.findTopicChannelArticles(
        channel.id,
        {
          datetimeRange: { start, end },
        }
      )

      expect(results).toHaveLength(2)
      expect(results.map((a) => a.id)).toEqual(
        expect.arrayContaining([articles[1].id, articles[2].id])
      )
    })

    test('includes articles created exactly at range boundaries', async () => {
      const start = baseTime
      const end = twoDaysAfter

      const results = await channelService.findTopicChannelArticles(
        channel.id,
        {
          datetimeRange: { start, end },
        }
      )

      expect(results).toHaveLength(3)
      expect(results.map((a) => a.id)).toEqual(
        expect.arrayContaining([articles[1].id, articles[2].id, articles[3].id])
      )
    })

    test('returns empty array when no articles in date range', async () => {
      const start = new Date(twoDaysAfter.getTime() + 86400000) // 3 day after
      const end = new Date(twoDaysAfter.getTime() + 172800000) // 4 day after

      const results = await channelService.findTopicChannelArticles(
        channel.id,
        {
          datetimeRange: { start, end },
        }
      )

      expect(results).toHaveLength(0)
    })
  })

  describe('spam filtering', () => {
    beforeEach(async () => {
      // Set up base spam scores and flags
      await atomService.update({
        table: 'article',
        where: { id: articles[0].id },
        data: {
          spamScore: 0.9,
          isSpam: true,
        },
      })
      await atomService.update({
        table: 'article',
        where: { id: articles[1].id },
        data: {
          spamScore: 0.5,
          isSpam: false,
        },
      })
      await atomService.update({
        table: 'article',
        where: { id: articles[2].id },
        data: {
          spamScore: null,
          isSpam: null,
        },
      })
      await atomService.update({
        table: 'article',
        where: { id: articles[3].id },
        data: {
          spamScore: 0.8,
          isSpam: null,
        },
      })

      await atomService.deleteMany({ table: 'user_feature_flag' })
    })

    test('excludes articles marked as spam regardless of score', async () => {
      const results = await channelService.findTopicChannelArticles(
        channel.id,
        { spamThreshold: 0.95 }
      )

      expect(results.find((a) => a.id === articles[0].id)).toBeUndefined()
      expect(results.map((a) => a.id)).toContain(articles[1].id)
    })

    test('includes articles explicitly marked as not spam regardless of score', async () => {
      // Update article[1] to have high spam score but marked as not spam
      await atomService.update({
        table: 'article',
        where: { id: articles[1].id },
        data: {
          spamScore: 0.99,
          isSpam: false,
        },
      })

      const results = await channelService.findTopicChannelArticles(
        channel.id,
        { spamThreshold: 0.7 }
      )

      expect(results.map((a) => a.id)).toContain(articles[1].id)
    })

    test('includes articles with null spam score when isSpam is null', async () => {
      const results = await channelService.findTopicChannelArticles(
        channel.id,
        { spamThreshold: 0.7 }
      )

      expect(results.map((a) => a.id)).toContain(articles[2].id)
    })

    test('filters articles by spam score when isSpam is null', async () => {
      const results = await channelService.findTopicChannelArticles(
        channel.id,
        { spamThreshold: 0.7 }
      )

      // article[3] has spam_score 0.8 > threshold 0.7 and isSpam is null
      expect(results.find((a) => a.id === articles[3].id)).toBeUndefined()
    })

    test('includes whitelisted authors regardless of spam score', async () => {
      // Create a whitelisted author
      const whitelistedAuthorId = '1'
      await atomService.create({
        table: 'user_feature_flag',
        data: {
          userId: whitelistedAuthorId,
          type: USER_FEATURE_FLAG_TYPE.bypassSpamDetection,
        },
      })

      // Update an article to have high spam score and whitelisted author
      await atomService.update({
        table: 'article',
        where: { id: articles[0].id },
        data: {
          authorId: whitelistedAuthorId,
          spamScore: 0.99,
          isSpam: true,
        },
      })

      const results = await channelService.findTopicChannelArticles(
        channel.id,
        { spamThreshold: 0.7 }
      )

      expect(results.map((a) => a.id)).toContain(articles[0].id)
    })

    test('applies spam threshold with other filters', async () => {
      // Set up article with both spam and channel score conditions
      await atomService.update({
        table: 'topic_channel_article',
        where: { articleId: articles[1].id, channelId: channel.id },
        data: { score: 0.9, isLabeled: false },
      })

      const results = await channelService.findTopicChannelArticles(
        channel.id,
        {
          spamThreshold: 0.7,
          channelThreshold: 0.8,
        }
      )

      // Should include article[1] as it passes both filters
      expect(results.map((a) => a.id)).toContain(articles[1].id)
      // Should exclude article[0] due to spam
      expect(results.find((a) => a.id === articles[0].id)).toBeUndefined()
      // Should exclude article[3] due to spam score > threshold
      expect(results.find((a) => a.id === articles[3].id)).toBeUndefined()
    })

    test('ignores spam threshold when not provided', async () => {
      const results = await channelService.findTopicChannelArticles(channel.id)

      expect(results).toHaveLength(4)
      expect(results.map((a) => a.id)).toEqual(
        expect.arrayContaining(articles.map((a) => a.id))
      )
    })
  })

  describe('restricted authors', () => {
    beforeEach(async () => {
      await atomService.deleteMany({ table: 'user_restriction' })
    })

    test('excludes articles from restricted authors', async () => {
      // Restrict an author
      await atomService.create({
        table: 'user_restriction',
        data: {
          userId: articles[0].authorId,
          type: 'articleNewest',
        },
      })

      const results = await channelService.findTopicChannelArticles(channel.id)

      expect(results.map((a) => a.id)).not.toContain(articles[0].id)
    })

    test('includes articles from non-restricted authors', async () => {
      const excludedAuthorId = '2'
      expect(articles[0].authorId).not.toBe(excludedAuthorId)
      // Restrict an author
      await atomService.create({
        table: 'user_restriction',
        data: {
          userId: excludedAuthorId,
          type: 'articleNewest',
        },
      })

      const results = await channelService.findTopicChannelArticles(channel.id)

      expect(results.length).toBeGreaterThan(0)
    })

    test('pinned articles are not excluded', async () => {
      // Restrict an author
      await atomService.create({
        table: 'user_restriction',
        data: {
          userId: articles[0].authorId,
          type: 'articleNewest',
        },
      })

      // Pin an article from a restricted author
      await channelService.togglePinChannelArticles({
        channelId: channel.id,
        channelType: NODE_TYPES.TopicChannel,
        articleIds: [articles[0].id],
        pinned: true,
      })

      const results = await channelService.findTopicChannelArticles(channel.id)

      // Should still include the pinned article from restricted author
      expect(results.map((a) => a.id)).toContain(articles[0].id)
    })
  })
})
