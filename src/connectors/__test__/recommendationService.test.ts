import type { Connections } from '#definitions/index.js'

import { v4 as uuidv4 } from 'uuid'
import {
  MATTERS_CHOICE_TOPIC_STATE,
  MATTERS_CHOICE_TOPIC_VALID_PIN_AMOUNTS,
  RECOMMENDATION_ARTICLE_AMOUNT_PER_DAY,
  COMMENT_STATE,
  ARTICLE_ACTION,
} from '#common/enums/index.js'
import {
  RecommendationService,
  AtomService,
  ArticleService,
} from '#connectors/index.js'

import { genConnections, closeConnections } from './utils.js'

let connections: Connections
let atomService: AtomService
let articleService: ArticleService
let recommendationService: RecommendationService

beforeAll(async () => {
  connections = await genConnections()
  atomService = new AtomService(connections)
  articleService = new ArticleService(connections)
  recommendationService = new RecommendationService(connections)
}, 30000)

afterAll(async () => {
  await closeConnections(connections)
})

const title = 'test title'
const pinAmount = MATTERS_CHOICE_TOPIC_VALID_PIN_AMOUNTS[0]
const articleIds = ['1', '2', '3']
const note = 'test note'

describe('IcymiTopic', () => {
  describe('createIcymiTopic', () => {
    test('pin amount is checked', () => {
      expect(
        recommendationService.createIcymiTopic({
          title,
          articleIds,
          pinAmount: 42,
          note,
        })
      ).rejects.toThrowError('Invalid pin amount')
    })
    test('articles are checked', () => {
      expect(
        recommendationService.createIcymiTopic({
          title,
          articleIds: ['0'],
          pinAmount,
          note,
        })
      ).rejects.toThrowError('Invalid article')
    })
    test('create topic', async () => {
      const topicNoNote = await recommendationService.createIcymiTopic({
        title,
        articleIds,
        pinAmount,
      })
      expect(topicNoNote.title).toBe(title)
      expect(topicNoNote.articles).toEqual(articleIds)
      expect(topicNoNote.pinAmount).toBe(pinAmount)
      expect(topicNoNote.note).toBe(null)
      expect(topicNoNote.state).toBe(MATTERS_CHOICE_TOPIC_STATE.editing)
      const topic = await recommendationService.createIcymiTopic({
        title,
        articleIds,
        pinAmount,
        note,
      })
      expect(topic.note).toBe(note)
    })
  })
  describe('updateIcymiTopic', () => {
    test('topic is checked', async () => {
      expect(
        recommendationService.updateIcymiTopic('0', {
          title,
        })
      ).rejects.toThrowError('Topic not found')
      const topic = await recommendationService.createIcymiTopic({
        title,
        articleIds,
        pinAmount,
        note,
      })
      await atomService.update({
        table: 'matters_choice_topic',
        where: { id: topic.id },
        data: { state: MATTERS_CHOICE_TOPIC_STATE.archived },
      })
      expect(
        recommendationService.updateIcymiTopic(topic.id, {
          title,
        })
      ).rejects.toThrowError('Invalid topic state')
    })
  })

  describe('publishIcymiTopic', () => {
    test('topic is checked', async () => {
      expect(recommendationService.publishIcymiTopic('0')).rejects.toThrowError(
        'Topic not found'
      )
      const topic = await recommendationService.createIcymiTopic({
        title,
        articleIds: ['1', '2'],
        pinAmount,
        note,
      })
      expect(topic.state).toBe(MATTERS_CHOICE_TOPIC_STATE.editing)

      // articles amount should more than or equal to pinAmount
      expect(
        recommendationService.publishIcymiTopic(topic.id)
      ).rejects.toThrowError('Articles amount less than pinAmount')

      await recommendationService.updateIcymiTopic(topic.id, {
        articleIds,
      })
      const published = await recommendationService.publishIcymiTopic(topic.id)
      expect(published.state).toBe(MATTERS_CHOICE_TOPIC_STATE.published)

      expect(
        recommendationService.publishIcymiTopic(topic.id)
      ).rejects.toThrowError('Invalid topic state')
    })
    test('archive other published topics when published', async () => {
      const topic1 = await recommendationService.createIcymiTopic({
        title,
        articleIds,
        pinAmount,
        note,
      })
      await recommendationService.publishIcymiTopic(topic1.id)

      const topic2 = await recommendationService.createIcymiTopic({
        title,
        articleIds,
        pinAmount,
        note,
      })
      const published = await recommendationService.publishIcymiTopic(topic2.id)
      expect(published.state).toBe(MATTERS_CHOICE_TOPIC_STATE.published)
      expect(published.publishedAt).not.toBeNull()

      const topic1AfterPublish = await atomService.findUnique({
        table: 'matters_choice_topic',
        where: { id: topic1.id },
      })
      expect(topic1AfterPublish.state).toBe(MATTERS_CHOICE_TOPIC_STATE.archived)
    })
  })
  describe('archiveIcymiTopic', () => {
    test('delete editing topic', async () => {
      const topic = await recommendationService.createIcymiTopic({
        title,
        articleIds,
        pinAmount,
        note,
      })
      expect(topic.state).toBe(MATTERS_CHOICE_TOPIC_STATE.editing)
      await recommendationService.archiveIcymiTopic(topic.id)
      const topicAfterArchive = await atomService.findUnique({
        table: 'matters_choice_topic',
        where: { id: topic.id },
      })
      expect(topicAfterArchive).toBeUndefined()
    })
    test('archive published topic', async () => {
      const topic = await recommendationService.createIcymiTopic({
        title,
        articleIds,
        pinAmount,
        note,
      })
      await recommendationService.publishIcymiTopic(topic.id)
      const archived = await recommendationService.archiveIcymiTopic(topic.id)
      expect(archived?.state).toBe(MATTERS_CHOICE_TOPIC_STATE.archived)
    })
    test('update articles in archived topic to icymi articles', async () => {
      await atomService.deleteMany({ table: 'matters_choice' })
      const topic = await recommendationService.createIcymiTopic({
        title,
        articleIds,
        pinAmount,
      })
      await recommendationService.publishIcymiTopic(topic.id)
      await recommendationService.archiveIcymiTopic(topic.id)
      const icymis = await atomService.findMany({
        table: 'matters_choice',
        orderBy: [{ column: 'updatedAt', order: 'desc' }],
      })
      expect(icymis.map(({ articleId }) => articleId)).toEqual(articleIds)

      const topic2 = await recommendationService.createIcymiTopic({
        title,
        articleIds: [...articleIds].reverse(),
        pinAmount,
      })
      await recommendationService.publishIcymiTopic(topic2.id)
      await recommendationService.archiveIcymiTopic(topic2.id)
      const icymis2 = await atomService.findMany({
        table: 'matters_choice',
        orderBy: [{ column: 'updatedAt', order: 'desc' }],
      })
      expect(icymis2.map(({ articleId }) => articleId)).toEqual(
        [...articleIds].reverse()
      )
    })
  })
})

describe('find icymi articles', () => {
  beforeEach(async () => {
    await atomService.deleteMany({ table: 'matters_choice' })
  })
  test('find nothing', async () => {
    const [articles, totalCount] =
      await recommendationService.findIcymiArticles({})
    expect(articles).toHaveLength(0)
    expect(totalCount).toBe(0)
  })
  test('find articles', async () => {
    const topic = await recommendationService.createIcymiTopic({
      title,
      articleIds,
      pinAmount,
    })
    await recommendationService.publishIcymiTopic(topic.id)
    await recommendationService.archiveIcymiTopic(topic.id)
    const [articles, totalCount] =
      await recommendationService.findIcymiArticles({})
    expect(articles).toHaveLength(3)
    expect(totalCount).toBe(3)

    const topic2 = await recommendationService.createIcymiTopic({
      title,
      articleIds,
      pinAmount,
    })
    await recommendationService.publishIcymiTopic(topic2.id)
    // articles in published topic are not included
    const [articles2, totalCount2] =
      await recommendationService.findIcymiArticles({})
    expect(articles2).toHaveLength(0)
    expect(totalCount2).toBe(0)
  })
})

describe('calRecommendationPoolSize', () => {
  test('returns minimum pool size when no articles', async () => {
    const days = 1
    const articlesQuery = connections.knex('article').where({ id: '0' })
    const poolSize = await recommendationService.calRecommendationPoolSize({
      articlesQuery,
      days,
      dateColumn: 'created_at',
    })
    expect(poolSize).toBe(RECOMMENDATION_ARTICLE_AMOUNT_PER_DAY * days)
  })
  test('returns pool size when there are articles', async () => {
    const days = 1
    for (let i = 0; i < RECOMMENDATION_ARTICLE_AMOUNT_PER_DAY + 1; i++) {
      await articleService.createArticle({
        title: `test title ${i}`,
        content: `test content ${i}`,
        authorId: '1',
      })
    }
    const articlesQuery = connections.knex('article')
    const poolSize = await recommendationService.calRecommendationPoolSize({
      articlesQuery,
      days,
      dateColumn: 'created_at',
    })
    expect(poolSize).toBeGreaterThan(
      RECOMMENDATION_ARTICLE_AMOUNT_PER_DAY * days
    )
  })
})

describe('calRecommendationScore', () => {
  test('calculates recommendation score with decay', async () => {
    // Create test articles with different timestamps
    const now = new Date()
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    const [article1] = await articleService.createArticle({
      title: 'test score article 1',
      content: 'test content 1',
      authorId: '1',
    })
    const [article2] = await articleService.createArticle({
      title: 'test score article 2',
      content: 'test content 2',
      authorId: '1',
    })
    await atomService.update({
      table: 'article',
      where: { id: article1.id },
      data: { createdAt: now },
    })
    await atomService.update({
      table: 'article',
      where: { id: article2.id },
      data: { createdAt: dayAgo },
    })

    // Add some activity to the articles
    // Simulate reads
    await Promise.all([
      atomService.create({
        table: 'article_read_count',
        data: {
          userId: '2',
          articleId: article1.id,
          count: '2',
          timedCount: '2',
          archived: false,
          lastRead: new Date(),
        },
      }),
      atomService.create({
        table: 'article_read_count',
        data: {
          userId: '3',
          articleId: article1.id,
          count: '1',
          timedCount: '1',
          archived: false,
          lastRead: new Date(),
        },
      }),
      atomService.create({
        table: 'article_read_count',
        data: {
          userId: '2',
          articleId: article2.id,
          count: '1',
          timedCount: '1',
          archived: false,
          lastRead: new Date(),
        },
      }),
    ])

    // Simulate comments
    const { id: targetTypeId } = await atomService.findFirst({
      table: 'entity_type',
      where: { table: 'article' },
    })
    await Promise.all([
      atomService.create({
        table: 'comment',
        data: {
          type: 'article',
          targetId: article1.id,
          targetTypeId,
          parentCommentId: null,
          state: COMMENT_STATE.active,
          authorId: '2',
          content: 'test comment 1',
          createdAt: now,
          uuid: uuidv4(),
        },
      }),
      atomService.create({
        table: 'comment',
        data: {
          type: 'article',
          targetId: article2.id,
          targetTypeId,
          parentCommentId: null,
          state: COMMENT_STATE.active,
          authorId: '2',
          content: 'test comment 2',
          createdAt: dayAgo,
          uuid: uuidv4(),
        },
      }),
    ])

    // Simulate bookmarks
    await Promise.all([
      atomService.create({
        table: 'action_article',
        data: {
          targetId: article1.id,
          userId: '2',
          action: ARTICLE_ACTION.subscribe,
          createdAt: now,
        },
      }),
      atomService.create({
        table: 'action_article',
        data: {
          targetId: article1.id,
          userId: '3',
          action: ARTICLE_ACTION.subscribe,
          createdAt: now,
        },
      }),
      atomService.create({
        table: 'action_article',
        data: {
          targetId: article2.id,
          userId: '2',
          action: ARTICLE_ACTION.subscribe,
          createdAt: dayAgo,
        },
      }),
    ])

    const articlesQuery = connections
      .knex('article')
      .whereIn('id', [article1.id, article2.id])

    const { query, column } =
      await recommendationService.addRecommendationScoreColumn({
        articlesQuery,
        decay: {
          days: 10,
          factor: 0.75,
        },
        dateColumn: 'created_at',
      })

    const result = await query.orderBy('id', 'asc')

    // Article 1 (newer) should have higher score than Article 2 (older)
    expect(Number(result[0][column])).toBeGreaterThan(Number(result[1][column]))

    // Verify score components
    // Article 1: 2 reads (0.4), 1 comment (0.4), 2 bookmarks (0.2)
    // No decay for newest article
    expect(Number(result[0][column])).toBeCloseTo(
      (0.4 * 2 + 0.4 * 1 + 0.2 * 2) * (1 - 0),
      2
    )

    // Article 2: 1 read (0.4), 1 comment (0.4), 1 bookmark (0.2)
    // Has some decay due to being older
    const expectedDecayFactor = Math.min(
      0.75,
      (0.75 * (24 * 3600)) / (10 * 24 * 3600)
    )
    expect(Number(result[1][column])).toBeCloseTo(
      (0.4 * 1 + 0.4 * 1 + 0.2 * 1) * (1 - expectedDecayFactor),
      2
    )
  })

  test('handles empty result set', async () => {
    const emptyQuery = connections.knex('article').where('id', '0') // Guaranteed to return no results

    const { query } = await recommendationService.addRecommendationScoreColumn({
      articlesQuery: emptyQuery,
      decay: {
        days: 7,
        factor: 0.5,
      },
      dateColumn: 'created_at',
    })

    const scores = await query
    expect(scores).toHaveLength(0)
  })
})
