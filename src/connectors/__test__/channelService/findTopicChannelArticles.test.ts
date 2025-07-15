import type { Connections, Article } from '#definitions/index.js'

import { AtomService } from '../../atomService.js'
import { CampaignService } from '../../campaignService.js'
import { ChannelService } from '../../channel/channelService.js'
import { genConnections, closeConnections, createCampaign } from '../utils.js'

let connections: Connections
let channelService: ChannelService
let atomService: AtomService
let channel: any
let articles: Article[]
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
    await channelService.togglePinTopicChannelArticles({
      channelId: channel.id,
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
    await channelService.togglePinTopicChannelArticles({
      channelId: channel.id,
      articleIds: [articles[1].id],
      pinned: true,
    })

    await channelService.togglePinTopicChannelArticles({
      channelId: channel.id,
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

  test('orders unpinned articles by article.created_at DESC', async () => {
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
      await Promise.all([
        atomService.update({
          table: 'article',
          where: { id: articles[0].id },
          data: { createdAt: oneDayBefore }, // 1 day before
        }),
        atomService.update({
          table: 'article',
          where: { id: articles[1].id },
          data: { createdAt: baseTime }, // exactly at start
        }),
        atomService.update({
          table: 'article',
          where: { id: articles[2].id },
          data: { createdAt: oneDayAfter }, // 1 day after
        }),
        atomService.update({
          table: 'article',
          where: { id: articles[3].id },
          data: { createdAt: twoDaysAfter }, // 2 days after
        }),
      ])
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
      const excludedAuthorId = '3'
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
      await channelService.togglePinTopicChannelArticles({
        channelId: channel.id,
        articleIds: [articles[0].id],
        pinned: true,
      })

      const results = await channelService.findTopicChannelArticles(channel.id)

      // Should still include the pinned article from restricted author
      expect(results.map((a) => a.id)).toContain(articles[0].id)
    })
  })

  test('excludes articles that are part of a writing challenge', async () => {
    const before = await channelService.findTopicChannelArticles(channel.id)

    await createCampaign(campaignService, before[0])

    const after = await channelService.findTopicChannelArticles(channel.id)

    expect(after.map((a) => a.id)).not.toContain(before[0].id)

    await atomService.deleteMany({ table: 'campaign_article' })
    await atomService.deleteMany({ table: 'campaign_user' })
    await atomService.deleteMany({ table: 'campaign_stage' })
    await atomService.deleteMany({ table: 'campaign' })
  })
})
