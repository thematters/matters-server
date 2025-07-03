import type { Connections, Article, User } from '#definitions/index.js'

import { v4 as uuidv4 } from 'uuid'
import {
  MATTERS_CHOICE_TOPIC_STATE,
  MATTERS_CHOICE_TOPIC_VALID_PIN_AMOUNTS,
  RECOMMENDATION_ARTICLE_AMOUNT_PER_DAY,
  COMMENT_STATE,
  ARTICLE_ACTION,
  DAY,
} from '#common/enums/index.js'
import {
  RecommendationService,
  AtomService,
  PublicationService,
  ChannelService,
  UserService,
} from '#connectors/index.js'

import { genConnections, closeConnections } from '../utils.js'

let connections: Connections
let atomService: AtomService
let publicationService: PublicationService
let channelService: ChannelService
let userService: UserService
let recommendationService: RecommendationService

beforeAll(async () => {
  connections = await genConnections()
  atomService = new AtomService(connections)
  publicationService = new PublicationService(connections)
  channelService = new ChannelService(connections)
  userService = new UserService(connections)
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
  test('new articles with today are excluded', async () => {
    const days = 10
    for (let i = 0; i < RECOMMENDATION_ARTICLE_AMOUNT_PER_DAY + 1; i++) {
      await publicationService.createArticle({
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
    expect(poolSize).toBe(RECOMMENDATION_ARTICLE_AMOUNT_PER_DAY * days)
  })
  test('returns pool size when there are articles', async () => {
    const days = 2
    for (let i = 0; i < RECOMMENDATION_ARTICLE_AMOUNT_PER_DAY * 3; i++) {
      const [article] = await publicationService.createArticle({
        title: `test title ${i}`,
        content: `test content ${i}`,
        authorId: '1',
      })
      await atomService.update({
        table: 'article',
        where: { id: article.id },
        data: {
          createdAt: new Date(Date.now() - DAY),
        },
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

describe('recommandation', () => {
  let author1: User, author2: User, author3: User
  let article1: Article, article2: Article, article3: Article, article4: Article
  beforeAll(async () => {
    const now = new Date()
    const dayAgo = new Date(now.getTime() - DAY)
    const twoDaysAgo = new Date(now.getTime() - 2 * DAY)

    author1 = await userService.create()
    author2 = await userService.create()
    author3 = await userService.create()

    // author1 has 2 articles, others only 1
    const [_article1] = await publicationService.createArticle({
      title: 'test score article 1',
      content: 'test content 1',
      authorId: author1.id,
    })
    await publicationService.createArticle({
      title: 'test score article 1',
      content: 'test content 1',
      authorId: author1.id,
    })
    const [_article2] = await publicationService.createArticle({
      title: 'test score article 2',
      content: 'test content 2',
      authorId: author2.id,
    })
    const [_article3] = await publicationService.createArticle({
      title: 'test score article 3',
      content: 'test content 3',
      authorId: author3.id,
    })
    const [_article4] = await publicationService.createArticle({
      title: 'test score article 3',
      content: 'test content 3',
      authorId: author3.id,
    })
    article1 = _article1
    article2 = _article2
    article3 = _article3
    article4 = _article4
    await atomService.update({
      table: 'article',
      where: { id: article1.id },
      data: { createdAt: dayAgo },
    })
    await atomService.update({
      table: 'article',
      where: { id: article2.id },
      data: { createdAt: twoDaysAgo },
    })
    await atomService.update({
      table: 'article',
      where: { id: article3.id },
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
          authorId: '3',
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
          authorId: '3',
          content: 'test comment 2',
          createdAt: dayAgo,
          uuid: uuidv4(),
        },
      }),
      atomService.create({
        table: 'comment',
        data: {
          type: 'article',
          targetId: article3.id,
          targetTypeId,
          parentCommentId: null,
          state: COMMENT_STATE.active,
          authorId: author3.id,
          content: 'test comment 3',
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
  })
  test('calculates recommendation score with decay', async () => {
    // Create test articles with different timestamps

    const decayDays = 10

    const articlesQuery = connections
      .knex('article')
      .whereIn('id', [article1.id, article2.id, article3.id, article4.id])

    const { query, column } =
      await recommendationService.addRecommendationScoreColumn({
        articlesQuery,
        decay: {
          days: decayDays,
          factor: 0.75,
        },
        dateColumn: 'created_at',
      })

    const result = await query.orderBy('id', 'asc')

    // articles of today (article4) are excluded
    expect(result).toHaveLength(3)

    // Article 1 (newer) should have higher score than Article 2 (older)
    expect(Number(result[0][column])).toBeGreaterThan(Number(result[1][column]))
    expect(Number(result[1][column])).toBeGreaterThan(Number(result[2][column]))

    const oneDaysAgoDecayFactor = Math.min(
      0.75,
      (0.75 * (1 * 24 * 3600)) / (decayDays * 24 * 3600)
    )
    // Verify score components
    // Article 1: 2 reads (0.4), 1 comment (0.4), 2 bookmarks (0.2)
    expect(Number(result[0][column])).toBeCloseTo(
      (0.4 * 2 + 0.4 * 1 + 0.2 * 2) * (1 - oneDaysAgoDecayFactor),
      2
    )

    const twoDaysAgoDecayFactor = Math.min(
      0.75,
      (0.75 * (2 * 24 * 3600)) / (decayDays * 24 * 3600)
    )
    // Article 2: 1 read (0.4), 1 comment (0.4), 1 bookmark (0.2)
    expect(Number(result[1][column])).toBeCloseTo(
      (0.4 * 1 + 0.4 * 1 + 0.2 * 1) * (1 - twoDaysAgoDecayFactor),
      2
    )

    // article 3 should have no score
    expect(Number(result[2][column])).toBeCloseTo(0, 2)
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
  describe('recommendAuthors', () => {
    test('returns authors', async () => {
      // authors with 1 article are not included
      const { query } = await recommendationService.recommendAuthors()
      const authors = await query
      expect(authors).toEqual([{ authorId: author1.id }])
    })
    test('returns authors in channel', async () => {
      const channel = await channelService.createTopicChannel({
        name: 'test channel',
        providerId: 'test provider',
        enabled: true,
      })
      const { query } = await recommendationService.recommendAuthors(channel.id)
      const authors = await query
      expect(authors.length).toEqual(0)
    })
  })
  describe('recommendTags', () => {
    beforeEach(async () => {
      await atomService.deleteMany({ table: 'article_tag' })
    })
    test('returns 0 tags', async () => {
      const { query } = await recommendationService.recommendTags()
      const tags = await query
      expect(tags.length).toEqual(0)
    })
    test('returns tags', async () => {
      await Promise.all([
        atomService.create({
          table: 'article_tag',
          data: {
            articleId: article1.id,
            tagId: '1',
          },
        }),
        atomService.create({
          table: 'article_tag',
          data: {
            articleId: article2.id,
            tagId: '1',
          },
        }),
        atomService.create({
          table: 'article_tag',
          data: {
            articleId: article3.id,
            tagId: '1',
          },
        }),
        atomService.create({
          table: 'article_tag',
          data: {
            articleId: article2.id,
            tagId: '2',
          },
        }),
        atomService.create({
          table: 'article_tag',
          data: {
            articleId: article2.id,
            tagId: '3',
          },
        }),
      ])
      const { query } = await recommendationService.recommendTags()
      const tags = await query
      expect(tags).toEqual([{ tagId: '1' }])
    })
    test('returns tags in channel', async () => {
      const channel = await channelService.createTopicChannel({
        name: 'test channel',
        providerId: 'test provider 2',
        enabled: true,
      })
      const { query } = await recommendationService.recommendTags(channel.id)
      const tags = await query
      expect(tags.length).toEqual(0)
    })
  })
})
