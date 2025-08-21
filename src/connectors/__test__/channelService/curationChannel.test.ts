import type {
  Connections,
  CurationChannel,
  Article,
} from '#definitions/index.js'
import {
  CURATION_CHANNEL_COLOR,
  CURATION_CHANNEL_STATE,
} from '#common/enums/index.js'

import { PublicationService } from '../../article/publicationService.js'
import { AtomService } from '../../atomService.js'
import { ChannelService } from '../../channel/channelService.js'
import { genConnections, closeConnections } from '../utils.js'

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
    expect(channel.showRecommendation).toBe(false) // default value
  })

  test('creates channel with all parameters', async () => {
    const channelData = {
      name: 'full-test-channel',
      note: 'test note',
      pinAmount: 5,
      color: CURATION_CHANNEL_COLOR.pink,
      activePeriod: [new Date('2024-01-01'), new Date('2024-12-31')] as const,
      state: CURATION_CHANNEL_STATE.published,
      showRecommendation: true,
    }

    const channel = await channelService.createCurationChannel(channelData)

    expect(channel).toBeDefined()
    expect(channel.name).toBe(channelData.name)
    expect(channel.note).toBe(channelData.note)
    expect(channel.pinAmount).toBe(channelData.pinAmount)
    expect(channel.color).toBe(channelData.color)
    expect(channel.state).toBe(channelData.state)
    expect(channel.showRecommendation).toBe(channelData.showRecommendation)
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

  test('creates channel with showRecommendation enabled', async () => {
    const channel = await channelService.createCurationChannel({
      name: 'recommendation-channel',
      showRecommendation: true,
    })

    expect(channel.showRecommendation).toBe(true)
  })

  test('creates channel with showRecommendation disabled', async () => {
    const channel = await channelService.createCurationChannel({
      name: 'no-recommendation-channel',
      showRecommendation: false,
    })

    expect(channel.showRecommendation).toBe(false)
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
      showRecommendation: false,
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
    expect(updatedChannel.showRecommendation).toBe(false)
  })

  test('updates multiple fields', async () => {
    const updates = {
      id: existingChannelId,
      name: 'new-name',
      note: 'new note',
      pinAmount: 10,
      color: CURATION_CHANNEL_COLOR.pink,
      state: CURATION_CHANNEL_STATE.published,
      showRecommendation: true,
    }

    const updatedChannel = await channelService.updateCurationChannel(updates)

    expect(updatedChannel.name).toBe(updates.name)
    expect(updatedChannel.note).toBe(updates.note)
    expect(updatedChannel.pinAmount).toBe(updates.pinAmount)
    expect(updatedChannel.color).toBe(updates.color)
    expect(updatedChannel.state).toBe(updates.state)
    expect(updatedChannel.showRecommendation).toBe(updates.showRecommendation)
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

  test('updates showRecommendation field', async () => {
    const updatedChannel = await channelService.updateCurationChannel({
      id: existingChannelId,
      showRecommendation: true,
    })

    expect(updatedChannel.showRecommendation).toBe(true)
  })

  test('toggles showRecommendation from true to false', async () => {
    // First update to true
    await channelService.updateCurationChannel({
      id: existingChannelId,
      showRecommendation: true,
    })

    // Then toggle to false
    const updatedChannel = await channelService.updateCurationChannel({
      id: existingChannelId,
      showRecommendation: false,
    })

    expect(updatedChannel.showRecommendation).toBe(false)
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
    expect(updatedChannel.showRecommendation).toBe(
      originalChannel.showRecommendation
    )
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
      orderBy: [{ column: 'updatedAt', order: 'desc' }],
    })

    expect(articles).toHaveLength(3)
    expect(articles.map((a) => a.articleId)).toEqual(
      expect.arrayContaining(articleIds)
    )
    expect(articles.every((a) => a.pinned === false || a.pinned === null)).toBe(
      true
    )
    // Verify updatedAt field is set and ordered correctly (most recent first)
    expect(articles[0].updatedAt).toBeDefined()
    expect(articles[1].updatedAt).toBeDefined()
    expect(articles[2].updatedAt).toBeDefined()
    expect(articles[0].updatedAt.getTime()).toBeGreaterThanOrEqual(
      articles[1].updatedAt.getTime()
    )
    expect(articles[1].updatedAt.getTime()).toBeGreaterThanOrEqual(
      articles[2].updatedAt.getTime()
    )
  })

  test('updates existing articles when adding duplicates', async () => {
    // First add some articles
    await channelService.addArticlesToCurationChannel({
      channelId: channel.id,
      articleIds: articleIds.slice(0, 2),
    })

    // Get the original updatedAt time
    const originalArticle = await atomService.findFirst({
      table: 'curation_channel_article',
      where: { channelId: channel.id, articleId: articleIds[0] },
    })

    // Wait a bit to ensure different timestamp
    await new Promise((resolve) => setTimeout(resolve, 10))

    // Try to add the same article again along with new ones
    await channelService.addArticlesToCurationChannel({
      channelId: channel.id,
      articleIds,
    })

    const articles = await atomService.findMany({
      table: 'curation_channel_article',
      where: { channelId: channel.id },
    })

    // Should still have 3 articles total
    expect(articles).toHaveLength(3)
    expect(articles.map((a) => a.articleId)).toEqual(
      expect.arrayContaining(articleIds)
    )

    // The existing article should have an updated timestamp
    const updatedArticle1 = await atomService.findFirst({
      table: 'curation_channel_article',
      where: { channelId: channel.id, articleId: articleIds[0] },
    })
    expect(updatedArticle1.updatedAt.getTime()).toBeGreaterThan(
      originalArticle.updatedAt.getTime()
    )
    const updatedArticle2 = await atomService.findFirst({
      table: 'curation_channel_article',
      where: { channelId: channel.id, articleId: articleIds[1] },
    })
    expect(updatedArticle1.updatedAt.getTime()).toBeGreaterThan(
      updatedArticle2.updatedAt.getTime()
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
    const results = await channelService.findCurationChannelArticles(channel.id)
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
        updatedAt: now,
      },
    })
    await atomService.create({
      table: 'curation_channel_article',
      data: {
        channelId: channel.id,
        articleId: articles[1].id,
        pinned: false,
        updatedAt: new Date(now.getTime() + 1000), // updated later
        createdAt: now,
      },
    })

    const results = await channelService
      .findCurationChannelArticles(channel.id)
      .orderBy('id', 'asc')
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
        updatedAt: baseTime,
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
        updatedAt: baseTime,
      },
    })

    const results = await channelService
      .findCurationChannelArticles(channel.id)
      .orderBy('id', 'asc')
    expect(results).toHaveLength(2)
    expect(results[0].id).toBe(articles[0].id) // Most recently pinned
    expect(results[1].id).toBe(articles[1].id) // Pinned earlier
  })

  test('orders unpinned articles by updatedAt DESC', async () => {
    const baseTime = new Date()
    // Add multiple unpinned articles with different updatedAt times
    await atomService.create({
      table: 'curation_channel_article',
      data: {
        channelId: channel.id,
        articleId: articles[0].id,
        pinned: false,
        updatedAt: new Date(baseTime.getTime() + 1000), // Updated last
        createdAt: baseTime,
      },
    })
    await atomService.create({
      table: 'curation_channel_article',
      data: {
        channelId: channel.id,
        articleId: articles[1].id,
        pinned: false,
        updatedAt: baseTime, // Updated first
        createdAt: baseTime,
      },
    })

    const results = await channelService
      .findCurationChannelArticles(channel.id)
      .orderBy('id', 'asc')
    expect(results).toHaveLength(2)
    expect(results[0].id).toBe(articles[0].id) // Most recently updated
    expect(results[1].id).toBe(articles[1].id) // Updated earlier
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
        updatedAt: baseTime,
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
        updatedAt: baseTime,
      },
    })
    await atomService.create({
      table: 'curation_channel_article',
      data: {
        channelId: channel.id,
        articleId: articles[2].id,
        pinned: false,
        updatedAt: new Date(baseTime.getTime() + 2000),
        createdAt: baseTime,
      },
    })
    await atomService.create({
      table: 'curation_channel_article',
      data: {
        channelId: channel.id,
        articleId: articles[3].id,
        pinned: false,
        updatedAt: baseTime,
        createdAt: baseTime,
      },
    })

    const results = await channelService
      .findCurationChannelArticles(channel.id)
      .orderBy('id', 'asc')
    expect(results).toHaveLength(4)

    // Check order: pinned (by pinnedAt DESC) then unpinned (by updatedAt DESC)
    expect(results[0].id).toBe(articles[0].id) // Most recently pinned
    expect(results[1].id).toBe(articles[1].id) // Pinned earlier
    expect(results[2].id).toBe(articles[2].id) // Most recently updated unpinned
    expect(results[3].id).toBe(articles[3].id) // Updated earlier unpinned
  })

  test('handles non-existent channel ID', async () => {
    const results = await channelService.findCurationChannelArticles('0')
    expect(results).toHaveLength(0)
  })
})

describe('findActiveCurationChannels', () => {
  beforeEach(async () => {
    await atomService.deleteMany({ table: 'curation_channel' })
  })

  test('returns only published channels with active periods', async () => {
    const now = new Date()
    const past = new Date(now.getTime() - 86400000) // 1 day ago
    const future = new Date(now.getTime() + 86400000) // 1 day from now

    // Create channels with different states and periods
    await channelService.createCurationChannel({
      name: 'active-published',
      state: CURATION_CHANNEL_STATE.published,
      activePeriod: [past, future],
    })

    await channelService.createCurationChannel({
      name: 'inactive-published',
      state: CURATION_CHANNEL_STATE.published,
      activePeriod: [future, new Date(future.getTime() + 86400000)],
    })

    await channelService.createCurationChannel({
      name: 'active-editing',
      state: CURATION_CHANNEL_STATE.editing,
      activePeriod: [past, future],
    })

    const activeChannels = await channelService.findActiveCurationChannels()
    expect(activeChannels).toHaveLength(1)
    expect(activeChannels[0].name).toBe('active-published')
    expect(activeChannels[0].state).toBe(CURATION_CHANNEL_STATE.published)
  })

  test('returns empty array when no channels are active', async () => {
    const now = new Date()
    const future = new Date(now.getTime() + 86400000)

    // Create only inactive channels
    await channelService.createCurationChannel({
      name: 'future-published',
      state: CURATION_CHANNEL_STATE.published,
      activePeriod: [future, new Date(future.getTime() + 86400000)],
    })

    await channelService.createCurationChannel({
      name: 'editing-channel',
      state: CURATION_CHANNEL_STATE.editing,
      activePeriod: [now, future],
    })

    const activeChannels = await channelService.findActiveCurationChannels()
    expect(activeChannels).toHaveLength(0)
  })

  test('handles channels with past active periods', async () => {
    const now = new Date()
    const past = new Date(now.getTime() - 86400000)
    const olderPast = new Date(past.getTime() - 86400000)

    // Create a channel with a past active period
    await channelService.createCurationChannel({
      name: 'past-published',
      state: CURATION_CHANNEL_STATE.published,
      activePeriod: [olderPast, past],
    })

    const activeChannels = await channelService.findActiveCurationChannels()
    expect(activeChannels).toHaveLength(0)
  })

  test('returns multiple active channels', async () => {
    const now = new Date()
    const past = new Date(now.getTime() - 86400000)
    const future = new Date(now.getTime() + 86400000)

    // Create multiple active channels
    await channelService.createCurationChannel({
      name: 'active-1',
      state: CURATION_CHANNEL_STATE.published,
      activePeriod: [past, future],
    })

    await channelService.createCurationChannel({
      name: 'active-2',
      state: CURATION_CHANNEL_STATE.published,
      activePeriod: [past, future],
    })

    const activeChannels = await channelService.findActiveCurationChannels()
    expect(activeChannels).toHaveLength(2)
    expect(activeChannels.map((c) => c.name)).toEqual(
      expect.arrayContaining(['active-1', 'active-2'])
    )
  })
})

describe('togglePinCurationChannelArticles', () => {
  let curationChannel: CurationChannel
  let articles: Article[]
  const articleIds = ['1', '2', '3', '4', '5', '6', '7']

  beforeEach(async () => {
    // Clean up tables
    await atomService.deleteMany({ table: 'curation_channel_article' })
    await atomService.deleteMany({ table: 'curation_channel' })

    curationChannel = await channelService.createCurationChannel({
      name: 'test-curation-channel',
      pinAmount: 3,
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

    await channelService.addArticlesToCurationChannel({
      channelId: curationChannel.id,
      articleIds: articleIds,
    })
  })

  describe('Curation Channel', () => {
    test('pins articles within limit', async () => {
      const result = await channelService.togglePinCurationChannelArticles({
        channelId: curationChannel.id,
        articleIds: [articles[0].id, articles[1].id],
        pinned: true,
      })

      const pinnedArticles = await atomService.findMany({
        table: 'curation_channel_article',
        where: { channelId: curationChannel.id, pinned: true },
      })

      expect(result.id).toBe(curationChannel.id)
      expect(pinnedArticles).toHaveLength(2)
      expect(pinnedArticles[0].pinnedAt).toBeDefined()
      expect(pinnedArticles[1].pinnedAt).toBeDefined()
    })

    test('unpins articles', async () => {
      // First pin some articles
      await channelService.togglePinCurationChannelArticles({
        channelId: curationChannel.id,
        articleIds: [articles[0].id, articles[1].id],
        pinned: true,
      })

      // Then unpin one
      await channelService.togglePinCurationChannelArticles({
        channelId: curationChannel.id,
        articleIds: [articles[0].id],
        pinned: false,
      })

      const pinnedArticles = await atomService.findMany({
        table: 'curation_channel_article',
        where: { channelId: curationChannel.id, pinned: true },
      })

      expect(pinnedArticles).toHaveLength(1)
      expect(pinnedArticles[0].articleId).toBe(articles[1].id)
    })

    test('respects custom pin amount', async () => {
      // Create channel with custom pin amount
      const customChannel = await channelService.createCurationChannel({
        name: 'custom-pin-amount',
        pinAmount: 2,
      })

      await channelService.addArticlesToCurationChannel({
        channelId: customChannel.id,
        articleIds: [articles[0].id, articles[1].id, articles[2].id],
      })

      // Try to pin 3 articles (limit is 2)
      await expect(
        channelService.togglePinCurationChannelArticles({
          channelId: customChannel.id,
          articleIds: [articles[0].id, articles[1].id, articles[2].id],
          pinned: true,
        })
      ).rejects.toThrow('Cannot pin more than 2 articles in this channel')
    })

    test('automatically unpins oldest articles when exceeding pin limit', async () => {
      // First pin 3 articles (max limit)
      await channelService.togglePinCurationChannelArticles({
        channelId: curationChannel.id,
        articleIds: articleIds.slice(0, 1),
        pinned: true,
      })
      await channelService.togglePinCurationChannelArticles({
        channelId: curationChannel.id,
        articleIds: articleIds.slice(1, 3),
        pinned: true,
      })

      // Get initial pinned articles
      const initialPinned = await atomService.findMany({
        table: 'curation_channel_article',
        where: { channelId: curationChannel.id, pinned: true },
      })
      expect(initialPinned).toHaveLength(3)

      // Try to pin one more article
      await channelService.togglePinCurationChannelArticles({
        channelId: curationChannel.id,
        articleIds: [articles[3].id],
        pinned: true,
      })

      // Verify oldest article was unpinned
      const finalPinned = await atomService.findMany({
        table: 'curation_channel_article',
        where: { channelId: curationChannel.id, pinned: true },
      })
      expect(finalPinned).toHaveLength(3)
      expect(finalPinned.map((a) => a.articleId)).toContain(articles[3].id)
      expect(finalPinned.map((a) => a.articleId)).not.toContain(articles[0].id)
    })

    test('handles multiple new pins when exceeding limit', async () => {
      // First pin 2 articles
      await channelService.togglePinCurationChannelArticles({
        channelId: curationChannel.id,
        articleIds: articleIds.slice(0, 2),
        pinned: true,
      })

      // Try to pin 2 more articles (exceeding limit by 1)
      await channelService.togglePinCurationChannelArticles({
        channelId: curationChannel.id,
        articleIds: [articles[2].id, articles[3].id],
        pinned: true,
      })

      // Verify oldest article was unpinned
      const finalPinned = await atomService.findMany({
        table: 'curation_channel_article',
        where: { channelId: curationChannel.id, pinned: true },
      })
      expect(finalPinned).toHaveLength(3)
      expect(finalPinned.map((a) => a.articleId)).toContain(articles[2].id)
      expect(finalPinned.map((a) => a.articleId)).toContain(articles[3].id)
      expect(finalPinned.map((a) => a.articleId)).not.toContain(articles[0].id)
    })
  })

  describe('Error Cases', () => {
    test('handles empty article ids array', async () => {
      const result = await channelService.togglePinCurationChannelArticles({
        channelId: curationChannel.id,
        articleIds: [],
        pinned: true,
      })

      expect(result.id).toBe(curationChannel.id)
    })

    test('allows unpinning even when over limit', async () => {
      // First pin some articles
      await channelService.togglePinCurationChannelArticles({
        channelId: curationChannel.id,
        articleIds: [articles[0].id, articles[1].id],
        pinned: true,
      })

      // Change pin limit to 1
      await channelService.updateCurationChannel({
        id: curationChannel.id,
        pinAmount: 1,
      })

      // Should still be able to unpin
      await expect(
        channelService.togglePinCurationChannelArticles({
          channelId: curationChannel.id,
          articleIds: [articles[0].id, articles[1].id],
          pinned: false,
        })
      ).resolves.toBeDefined()

      const pinnedArticles = await atomService.findMany({
        table: 'curation_channel_article',
        where: { channelId: curationChannel.id, pinned: true },
      })
      expect(pinnedArticles).toHaveLength(0)
    })
  })
})
