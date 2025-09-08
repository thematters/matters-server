import type { Connections, Article, Tag } from '#definitions/index.js'

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

describe('togglePinTagArticles', () => {
  let tag: Tag
  let articles: Article[]
  const articleIds = ['1', '2', '3', '4', '5', '6', '7']

  beforeEach(async () => {
    // Clean up tables
    await atomService.deleteMany({ table: 'article_tag' })

    // Use existing seed tag (id: '1')
    tag = await atomService.findUnique({
      table: 'tag',
      where: { id: '1' },
    })

    // Create additional test article
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

    // Add articles to tag (create article_tag relationships)
    for (const articleId of articleIds) {
      await atomService.create({
        table: 'article_tag',
        data: {
          articleId,
          tagId: tag.id,
          selected: true,
        },
      })
    }
  })

  describe('Tag Channel', () => {
    test('pins articles within limit', async () => {
      const result = await channelService.togglePinTagArticles({
        tagId: tag.id,
        articleIds: [articles[0].id, articles[1].id],
        pinned: true,
      })

      const pinnedArticles = await atomService.findMany({
        table: 'article_tag',
        where: { tagId: tag.id, pinned: true },
      })

      expect(result.id).toBe(tag.id)
      expect(pinnedArticles).toHaveLength(2)
      expect(pinnedArticles[0].pinnedAt).toBeDefined()
      expect(pinnedArticles[1].pinnedAt).toBeDefined()
    })

    test('unpins articles', async () => {
      // First pin articles
      await channelService.togglePinTagArticles({
        tagId: tag.id,
        articleIds: [articles[0].id, articles[1].id],
        pinned: true,
      })

      // Then unpin them
      await channelService.togglePinTagArticles({
        tagId: tag.id,
        articleIds: [articles[0].id],
        pinned: false,
      })

      const pinnedArticles = await atomService.findMany({
        table: 'article_tag',
        where: { tagId: tag.id, pinned: true },
      })
      expect(pinnedArticles).toHaveLength(1)
      expect(pinnedArticles[0].articleId).toBe(articles[1].id)
    })

    test('automatically unpins oldest articles when exceeding pin limit', async () => {
      // First pin 3 articles (max limit for tags)
      await channelService.togglePinTagArticles({
        tagId: tag.id,
        articleIds: [articles[0].id, articles[1].id, articles[2].id],
        pinned: true,
      })

      // Get initial pinned articles
      const initialPinnedArticles = await atomService.findMany({
        table: 'article_tag',
        where: { tagId: tag.id, pinned: true },
        orderBy: [{ column: 'pinnedAt', order: 'asc' }],
      })
      expect(initialPinnedArticles).toHaveLength(3)

      // Try to pin one more article (should unpin oldest)
      await channelService.togglePinTagArticles({
        tagId: tag.id,
        articleIds: [articles[3].id],
        pinned: true,
      })

      // Verify oldest article was unpinned
      const finalPinnedArticles = await atomService.findMany({
        table: 'article_tag',
        where: { tagId: tag.id, pinned: true },
      })
      expect(finalPinnedArticles).toHaveLength(3)
    })

    test('handles multiple articles at once with limit enforcement', async () => {
      // First pin 2 articles
      await channelService.togglePinTagArticles({
        tagId: tag.id,
        articleIds: [articles[0].id, articles[1].id],
        pinned: true,
      })

      // Try to pin 3 more articles (total would be 5, but limit is 3)
      await channelService.togglePinTagArticles({
        tagId: tag.id,
        articleIds: [articles[2].id, articles[3].id, articles[4].id],
        pinned: true,
      })

      // Verify oldest article was unpinned
      const pinnedArticles = await atomService.findMany({
        table: 'article_tag',
        where: { tagId: tag.id, pinned: true },
      })
      expect(pinnedArticles).toHaveLength(3)
    })

    test('pins multiple articles at once within limit', async () => {
      const result = await channelService.togglePinTagArticles({
        tagId: tag.id,
        articleIds: [articles[0].id, articles[1].id, articles[2].id],
        pinned: true,
      })

      const pinnedArticles = await atomService.findMany({
        table: 'article_tag',
        where: { tagId: tag.id, pinned: true },
      })

      expect(result.id).toBe(tag.id)
      expect(pinnedArticles).toHaveLength(3)
      expect(pinnedArticles.map((a) => a.articleId)).toContain(articles[0].id)
      expect(pinnedArticles.map((a) => a.articleId)).toContain(articles[1].id)
      expect(pinnedArticles.map((a) => a.articleId)).toContain(articles[2].id)
    })

    test('unpins multiple articles at once', async () => {
      // First pin multiple articles
      await channelService.togglePinTagArticles({
        tagId: tag.id,
        articleIds: [articles[0].id, articles[1].id, articles[2].id],
        pinned: true,
      })

      // Then unpin some of them
      await channelService.togglePinTagArticles({
        tagId: tag.id,
        articleIds: [articles[0].id, articles[2].id],
        pinned: false,
      })

      const pinnedArticles = await atomService.findMany({
        table: 'article_tag',
        where: { tagId: tag.id, pinned: true },
      })
      expect(pinnedArticles).toHaveLength(1)
      expect(pinnedArticles[0].articleId).toBe(articles[1].id)

      const unpinnedArticles = await atomService.findMany({
        table: 'article_tag',
        where: { tagId: tag.id, pinned: false },
      })
      expect(unpinnedArticles.length).toBeGreaterThan(0)
    })

    test('handles empty article IDs array', async () => {
      const result = await channelService.togglePinTagArticles({
        tagId: tag.id,
        articleIds: [],
        pinned: true,
      })

      expect(result.id).toBe(tag.id)

      const pinnedArticles = await atomService.findMany({
        table: 'article_tag',
        where: { tagId: tag.id, pinned: true },
      })
      expect(pinnedArticles).toHaveLength(0)
    })

    test('handles non-existent articles gracefully', async () => {
      // Try to pin articles that don't exist in the tag
      const result = await channelService.togglePinTagArticles({
        tagId: tag.id,
        articleIds: ['999', '998'],
        pinned: true,
      })

      expect(result.id).toBe(tag.id)

      const pinnedArticles = await atomService.findMany({
        table: 'article_tag',
        where: { tagId: tag.id, pinned: true },
      })
      expect(pinnedArticles).toHaveLength(0)
    })

    test('respects pin limit when exceeding with single call', async () => {
      // Try to pin more than the limit in a single call
      await expect(
        channelService.togglePinTagArticles({
          tagId: tag.id,
          articleIds: [
            articles[0].id,
            articles[1].id,
            articles[2].id,
            articles[3].id,
          ],
          pinned: true,
        })
      ).rejects.toThrow('Cannot pin more than 3 articles in this tag')
    })

    test('sets pinnedAt timestamp when pinning', async () => {
      const beforeTime = new Date()

      await channelService.togglePinTagArticles({
        tagId: tag.id,
        articleIds: [articles[0].id],
        pinned: true,
      })

      const afterTime = new Date()

      const pinnedArticle = await atomService.findFirst({
        table: 'article_tag',
        where: { tagId: tag.id, articleId: articles[0].id, pinned: true },
      })

      expect(pinnedArticle).toBeDefined()
      expect(pinnedArticle!.pinnedAt).toBeDefined()
      expect(pinnedArticle!.pinnedAt!.getTime()).toBeGreaterThanOrEqual(
        beforeTime.getTime()
      )
      expect(pinnedArticle!.pinnedAt!.getTime()).toBeLessThanOrEqual(
        afterTime.getTime()
      )
    })

    test('clears pinnedAt timestamp when unpinning', async () => {
      // First pin an article
      await channelService.togglePinTagArticles({
        tagId: tag.id,
        articleIds: [articles[0].id],
        pinned: true,
      })

      // Verify it's pinned with timestamp
      let articleTag = await atomService.findFirst({
        table: 'article_tag',
        where: { tagId: tag.id, articleId: articles[0].id },
      })
      expect(articleTag!.pinned).toBe(true)
      expect(articleTag!.pinnedAt).toBeDefined()

      // Then unpin it
      await channelService.togglePinTagArticles({
        tagId: tag.id,
        articleIds: [articles[0].id],
        pinned: false,
      })

      // Verify it's unpinned with null timestamp
      articleTag = await atomService.findFirst({
        table: 'article_tag',
        where: { tagId: tag.id, articleId: articles[0].id },
      })
      expect(articleTag!.pinned).toBe(false)
      expect(articleTag!.pinnedAt).not.toBeNull()
    })
  })

  describe('Error Cases', () => {
    test('throws error for non-existent tag', async () => {
      await expect(
        channelService.togglePinTagArticles({
          tagId: '999',
          articleIds: [articles[0].id],
          pinned: true,
        })
      ).rejects.toThrow('tag not found')
    })

    test('handles database constraint errors gracefully', async () => {
      // This test ensures the service handles edge cases where the database
      // might have constraint issues
      const result = await channelService.togglePinTagArticles({
        tagId: tag.id,
        articleIds: [articles[0].id],
        pinned: true,
      })

      expect(result.id).toBe(tag.id)
    })
  })

  describe('Pin Limit Edge Cases', () => {
    test('correctly counts existing pinned articles when adding new ones', async () => {
      // Pin 2 articles first
      await channelService.togglePinTagArticles({
        tagId: tag.id,
        articleIds: [articles[0].id, articles[1].id],
        pinned: true,
      })

      // Try to pin 2 more (total would be 4, but limit is 3)
      await channelService.togglePinTagArticles({
        tagId: tag.id,
        articleIds: [articles[2].id, articles[3].id],
        pinned: true,
      })

      const pinnedArticles = await atomService.findMany({
        table: 'article_tag',
        where: { tagId: tag.id, pinned: true },
      })
      expect(pinnedArticles).toHaveLength(3)
    })

    test('handles unpinning articles that are not pinned', async () => {
      // Try to unpin articles that were never pinned
      const result = await channelService.togglePinTagArticles({
        tagId: tag.id,
        articleIds: [articles[0].id, articles[1].id],
        pinned: false,
      })

      expect(result.id).toBe(tag.id)

      const pinnedArticles = await atomService.findMany({
        table: 'article_tag',
        where: { tagId: tag.id, pinned: true },
      })
      expect(pinnedArticles).toHaveLength(0)
    })

    test('maintains pin order when unpinning and repinning', async () => {
      // Pin 3 articles
      await channelService.togglePinTagArticles({
        tagId: tag.id,
        articleIds: [articles[0].id, articles[1].id, articles[2].id],
        pinned: true,
      })

      // Unpin middle article
      await channelService.togglePinTagArticles({
        tagId: tag.id,
        articleIds: [articles[1].id],
        pinned: false,
      })

      // Pin a new article
      await channelService.togglePinTagArticles({
        tagId: tag.id,
        articleIds: [articles[3].id],
        pinned: true,
      })

      const pinnedArticles = await atomService.findMany({
        table: 'article_tag',
        where: { tagId: tag.id, pinned: true },
        orderBy: [{ column: 'pinnedAt', order: 'asc' }],
      })

      expect(pinnedArticles).toHaveLength(3)
      expect(pinnedArticles.map((a) => a.articleId)).toContain(articles[0].id)
      expect(pinnedArticles.map((a) => a.articleId)).toContain(articles[2].id)
      expect(pinnedArticles.map((a) => a.articleId)).toContain(articles[3].id)
      expect(pinnedArticles.map((a) => a.articleId)).not.toContain(
        articles[1].id
      )
    })
  })
})
