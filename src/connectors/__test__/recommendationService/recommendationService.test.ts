import type { Connections, Article, User } from '#definitions/index.js'

import { v4 as uuidv4 } from 'uuid'
import {
  MATTERS_CHOICE_TOPIC_STATE,
  MATTERS_CHOICE_TOPIC_VALID_PIN_AMOUNTS,
  RECOMMENDATION_ARTICLE_AMOUNT_PER_DAY,
  COMMENT_STATE,
  ARTICLE_ACTION,
  DAY,
  USER_ACTION,
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

    describe('moment side (sitewide UNION)', () => {
      let hotTagId: string
      let coldTagId: string
      let momentTypeId: string
      const createdMomentIds: string[] = []

      const createMoment = async (
        authorId: string,
        { likers = [] }: { likers?: string[] } = {}
      ) => {
        const moment = await atomService.create({
          table: 'moment',
          data: {
            shortHash: `rec-${uuidv4().slice(0, 8)}`,
            authorId,
            content: 'moment',
            state: 'active',
            // the pipeline drops content created today (UTC+8), mirroring the
            // article side; backdate so moments enter the pool
            createdAt: new Date(Date.now() - DAY),
          },
        })
        createdMomentIds.push(moment.id)
        for (const userId of likers) {
          await atomService.create({
            table: 'action_moment',
            data: { userId, action: 'like', targetId: moment.id },
          })
        }
        return moment.id as string
      }

      const tagMoment = async (momentId: string, tagId: string) =>
        atomService.create({
          table: 'moment_tag',
          data: { momentId, tagId },
        })

      // non-author comment lifts the moment score above the median gate
      const commentMoment = async (
        momentId: string,
        authorId: string,
        isSpam: boolean | null = false
      ) =>
        atomService.create({
          table: 'comment',
          data: {
            uuid: uuidv4(),
            type: 'moment',
            targetId: momentId,
            targetTypeId: momentTypeId,
            parentCommentId: null,
            state: COMMENT_STATE.active,
            authorId,
            content: 'c',
            isSpam,
          },
        })

      beforeAll(async () => {
        const { id } = await atomService.findFirst({
          table: 'entity_type',
          where: { table: 'moment' },
        })
        momentTypeId = id
        const hotTag = await atomService.create({
          table: 'tag',
          data: { content: `rec-hot-${uuidv4().slice(0, 8)}`, creator: '1' },
        })
        const coldTag = await atomService.create({
          table: 'tag',
          data: { content: `rec-cold-${uuidv4().slice(0, 8)}`, creator: '1' },
        })
        hotTagId = hotTag.id
        coldTagId = coldTag.id
      })

      afterEach(async () => {
        // moment_tag has FK to moment; clear children first
        await atomService.deleteMany({ table: 'moment_tag' })
        await atomService.deleteMany({ table: 'action_moment' })
        for (const momentId of createdMomentIds) {
          await atomService.deleteMany({
            table: 'comment',
            where: { targetId: momentId, type: 'moment' },
          })
          await atomService.deleteMany({
            table: 'moment',
            where: { id: momentId },
          })
        }
        createdMomentIds.length = 0
      })

      test('folds moment tags in and filters by author breadth', async () => {
        // pool scores (identical decay): hot1 1.2, hot2 1.0, hot3 0.6,
        // cold1 1.0, cold2/cold3 0 -> median 0.8, so hot1/hot2/cold1 pass the
        // median gate and both tags reach the breadth gate; hot tag spans 3
        // authors vs 1 for the cold tag, so only the hot tag passes breadth
        const hot1 = await createMoment(author1.id)
        const hot2 = await createMoment(author2.id, { likers: [author1.id] })
        const hot3 = await createMoment(author3.id)
        for (const id of [hot1, hot2, hot3]) {
          await tagMoment(id, hotTagId)
        }
        await commentMoment(hot1, author2.id)
        await commentMoment(hot1, author3.id)
        await commentMoment(hot2, author3.id)
        await commentMoment(hot3, author1.id)
        // cold tag: single author; cold1 passes the median gate, the zero-score
        // moments keep the median below it
        const cold1 = await createMoment(author1.id, { likers: [author2.id] })
        await commentMoment(cold1, author2.id)
        const cold2 = await createMoment(author1.id) // no interaction -> score 0
        const cold3 = await createMoment(author1.id) // no interaction -> score 0
        for (const id of [cold1, cold2, cold3]) {
          await tagMoment(id, coldTagId)
        }

        const { query } = await recommendationService.recommendTags()
        const tags = (await query) as Array<{ tagId: string }>
        const ids = tags.map(({ tagId }) => tagId)
        expect(ids).toContain(hotTagId)
        expect(ids).not.toContain(coldTagId)
      })

      test('excludes spam moments from the pool', async () => {
        // seed ships spam_detection off; enable it so recommendTags gets a
        // non-null threshold and the null-safe spam filter actually applies
        const threshold = 0.5
        await atomService.updateMany({
          table: 'feature_flag',
          where: { name: 'spam_detection' },
          data: { flag: 'on', value: threshold },
        })
        const spamScore = threshold + 0.1
        const m1 = await createMoment(author1.id)
        const m2 = await createMoment(author2.id)
        await tagMoment(m1, hotTagId)
        await tagMoment(m2, hotTagId)
        await commentMoment(m1, author3.id)
        await commentMoment(m2, author3.id)
        // mark the whole hot-tag pool as spam
        await atomService.updateMany({
          table: 'moment',
          where: { id: m1 },
          data: { spamScore },
        })
        await atomService.updateMany({
          table: 'moment',
          where: { id: m2 },
          data: { spamScore },
        })

        try {
          const { query } = await recommendationService.recommendTags()
          const tags = (await query) as Array<{ tagId: string }>
          expect(tags.map(({ tagId }) => tagId)).not.toContain(hotTagId)
        } finally {
          await atomService.updateMany({
            table: 'feature_flag',
            where: { name: 'spam_detection' },
            data: { flag: 'off', value: threshold },
          })
        }
      })

      test('empty moment pool: returns only article side, no error', async () => {
        // no moments exist: median/percentile over the empty pool return NULL
        // and count > NULL is always false, so the moment side contributes no
        // rows and the UNION still resolves without error
        await Promise.all(
          [article1.id, article2.id, article3.id].map((articleId) =>
            atomService.create({
              table: 'article_tag',
              data: { articleId, tagId: '1' },
            })
          )
        )
        const { query } = await recommendationService.recommendTags()
        const tags = (await query) as Array<{ tagId: string }>
        const ids = tags.map(({ tagId }) => tagId)
        expect(Array.isArray(tags)).toBe(true)
        expect(ids).not.toContain(hotTagId)
        expect(ids).not.toContain(coldTagId)
      })
    })
  })

  describe('countUsersFollowers', () => {
    let user1: User
    let user2: User
    let user3: User

    beforeEach(async () => {
      // Create test users
      const randomUserName = uuidv4()
      user1 = await userService.create({ userName: `user1 ${randomUserName}` })
      user2 = await userService.create({ userName: `user2 ${randomUserName}` })
      user3 = await userService.create({ userName: `user3 ${randomUserName}` })
    })

    const createFollowAction = async (followerId: string, targetId: string) => {
      return atomService.create({
        table: 'action_user',
        data: {
          userId: followerId,
          targetId,
          action: USER_ACTION.follow,
        },
      })
    }

    test('returns empty object for empty userIds array', async () => {
      const result = await recommendationService.countUsersFollowers([])
      expect(result).toEqual({})
    })

    test('returns zero counts for users with no followers', async () => {
      const result = await recommendationService.countUsersFollowers([
        user1.id,
        user2.id,
        user3.id,
      ])

      expect(result).toEqual({
        [user1.id]: 0,
        [user2.id]: 0,
        [user3.id]: 0,
      })
    })

    test('counts followers correctly for single user', async () => {
      // user2 and user3 follow user1
      await createFollowAction(user2.id, user1.id)
      await createFollowAction(user3.id, user1.id)

      const result = await recommendationService.countUsersFollowers([user1.id])

      expect(result).toEqual({
        [user1.id]: 2,
      })
    })
  })
})
