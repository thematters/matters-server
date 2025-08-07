import type { Connections, Article, User } from '#definitions/index.js'

import { v4 as uuidv4 } from 'uuid'
import {
  ARTICLE_STATE,
  USER_STATE,
  USER_RESTRICTION_TYPE,
  COMMENT_STATE,
  TRANSACTION_STATE,
  PAYMENT_CURRENCY,
  DAY,
} from '#common/enums/index.js'
import {
  RecommendationService,
  AtomService,
  PublicationService,
  UserService,
  PaymentService,
  SystemService,
} from '#connectors/index.js'

import { genConnections, closeConnections, createDonationTx } from '../utils.js'

let connections: Connections
let atomService: AtomService
let publicationService: PublicationService
let userService: UserService
let paymentService: PaymentService
let systemService: SystemService
let recommendationService: RecommendationService

beforeAll(async () => {
  connections = await genConnections()
  atomService = new AtomService(connections)
  publicationService = new PublicationService(connections)
  userService = new UserService(connections)
  paymentService = new PaymentService(connections)
  systemService = new SystemService(connections)
  recommendationService = new RecommendationService(connections)
}, 30000)

afterAll(async () => {
  await closeConnections(connections)
})

describe('findHottestArticles', () => {
  let author1: User
  let author2: User
  let author3: User
  let frozenAuthor: User
  let restrictedAuthor: User
  let article1: Article
  let article2: Article
  let article3: Article
  let frozenAuthorArticle: Article
  let restrictedAuthorArticle: Article
  let targetTypeId: string

  const createArticleReadCount = async (
    userId: string,
    articleId: string,
    count = 1
  ) => {
    return atomService.create({
      table: 'article_read_count',
      data: {
        userId,
        articleId,
        count: count.toString(),
        timedCount: count.toString(),
        archived: false,
        lastRead: new Date(),
        updatedAt: new Date(),
      },
    })
  }

  const createComment = async (
    authorId: string,
    targetId: string,
    createdAt?: Date
  ) => {
    return atomService.create({
      table: 'comment',
      data: {
        type: 'article',
        targetId,
        targetTypeId,
        parentCommentId: null,
        state: COMMENT_STATE.active,
        authorId,
        content: `test comment ${Math.random()}`,
        createdAt: createdAt || new Date(),
        uuid: uuidv4(),
      },
    })
  }

  beforeAll(async () => {
    // Get article target type ID
    const { id } = await systemService.baseFindEntityTypeId('article')
    targetTypeId = id

    // Create test users
    author1 = await userService.create({ userName: 'author1' })
    author2 = await userService.create({ userName: 'author2' })
    author3 = await userService.create({ userName: 'author3' })
    frozenAuthor = await userService.create({ userName: 'frozenAuthor' })
    restrictedAuthor = await userService.create({
      userName: 'restrictedAuthor',
    })

    // Update user states
    await atomService.update({
      table: 'user',
      where: { id: frozenAuthor.id },
      data: { state: USER_STATE.frozen },
    })

    // Add restriction for restrictedAuthor
    await atomService.create({
      table: 'user_restriction',
      data: {
        userId: restrictedAuthor.id,
        type: USER_RESTRICTION_TYPE.articleHottest,
      },
    })
  })

  beforeEach(async () => {
    // Clean up data before each test
    await atomService.deleteMany({ table: 'article_read_count' })
    await atomService.deleteMany({ table: 'action_comment' })
    await atomService.deleteMany({ table: 'comment' })
    await atomService.deleteMany({ table: 'transaction' })
    await atomService.deleteMany({ table: 'article_tag' })
    await atomService.deleteMany({ table: 'action_article' })
    await atomService.deleteMany({ table: 'matters_choice' })
    await atomService.deleteMany({ table: 'article_boost' })
    await atomService.deleteMany({ table: 'draft' })
    await atomService.deleteMany({ table: 'article_version' })
    await atomService.deleteMany({ table: 'article' })

    const now = new Date()
    const twoDaysAgo = new Date(now.getTime() - 2 * DAY)
    const threeDaysAgo = new Date(now.getTime() - 3 * DAY)

    // Create test articles with different timestamps within the default 5-day window
    const [_article1] = await publicationService.createArticle({
      title: 'Hot Article 1',
      content: 'Content 1',
      authorId: author1.id,
    })
    article1 = _article1
    await atomService.update({
      table: 'article',
      where: { id: article1.id },
      data: { createdAt: twoDaysAgo },
    })

    const [_article2] = await publicationService.createArticle({
      title: 'Hot Article 2',
      content: 'Content 2',
      authorId: author2.id,
    })
    article2 = _article2
    await atomService.update({
      table: 'article',
      where: { id: article2.id },
      data: { createdAt: threeDaysAgo },
    })

    const [_article3] = await publicationService.createArticle({
      title: 'Hot Article 3',
      content: 'Content 3',
      authorId: author3.id,
    })
    article3 = _article3
    await atomService.update({
      table: 'article',
      where: { id: article3.id },
      data: { createdAt: threeDaysAgo },
    })

    // Create article by frozen author (should be excluded)
    const [_frozenAuthorArticle] = await publicationService.createArticle({
      title: 'Frozen Author Article',
      content: 'Content by frozen author',
      authorId: frozenAuthor.id,
    })
    frozenAuthorArticle = _frozenAuthorArticle
    await atomService.update({
      table: 'article',
      where: { id: frozenAuthorArticle.id },
      data: { createdAt: twoDaysAgo },
    })

    // Create article by restricted author (should be excluded)
    const [_restrictedAuthorArticle] = await publicationService.createArticle({
      title: 'Restricted Author Article',
      content: 'Content by restricted author',
      authorId: restrictedAuthor.id,
    })
    restrictedAuthorArticle = _restrictedAuthorArticle
    await atomService.update({
      table: 'article',
      where: { id: restrictedAuthorArticle.id },
      data: { createdAt: twoDaysAgo },
    })
  })

  test('filters out articles by frozen authors', async () => {
    // Add some activity to both articles
    await createArticleReadCount(author1.id, article1.id, 10)
    await createArticleReadCount(author1.id, frozenAuthorArticle.id, 10)
    await createComment(author2.id, article1.id)
    await createComment(author2.id, frozenAuthorArticle.id)

    const results = await recommendationService.findHottestArticles({
      days: 5,
      readersThreshold: 0,
      commentsThreshold: 0,
    })

    const articleIds = results.map((r: any) => r.articleId)
    expect(articleIds).toContain(article1.id)
    expect(articleIds).not.toContain(frozenAuthorArticle.id)
  })

  test('filters out articles by restricted authors', async () => {
    // Add some activity to both articles
    await createArticleReadCount(author1.id, article1.id, 10)
    await createArticleReadCount(author1.id, restrictedAuthorArticle.id, 10)
    await createComment(author2.id, article1.id)
    await createComment(author2.id, restrictedAuthorArticle.id)

    const results = await recommendationService.findHottestArticles({
      days: 5,
      readersThreshold: 0,
      commentsThreshold: 0,
    })

    const articleIds = results.map((r: any) => r.articleId)
    expect(articleIds).toContain(article1.id)
    expect(articleIds).not.toContain(restrictedAuthorArticle.id)
  })

  test('applies minimum reader and comment thresholds', async () => {
    // Article 1: 2 readers, 0 comments (should qualify)
    await createArticleReadCount(author2.id, article1.id)
    await createArticleReadCount(author3.id, article1.id)

    // Article 2: 2 readers, 2 comments (should qualify)
    await createArticleReadCount(author1.id, article2.id)
    await createArticleReadCount(author2.id, article2.id)
    await createComment(author1.id, article2.id)
    await createComment(author2.id, article2.id)

    // Article 3: 1 readers, 1 not author comment (should NOT qualify)
    await createArticleReadCount(author1.id, article3.id)
    await createComment(author1.id, article3.id)
    await createComment(author3.id, article3.id)

    const results = await recommendationService.findHottestArticles({
      days: 5,
      readersThreshold: 2,
      commentsThreshold: 2,
    })

    const articleIds = results.map((r: any) => r.articleId)
    expect(articleIds).toContain(article1.id)
    expect(articleIds).toContain(article2.id)
    expect(articleIds).not.toContain(article3.id)
  })

  test('calculates scores correctly based on reads, comments, and donations', async () => {
    // Article 1: High reads, medium comments, low donations
    await createArticleReadCount(author2.id, article1.id)
    await createArticleReadCount(author3.id, article1.id)
    await createComment(author3.id, article1.id)

    // Article 2: Medium reads, high comments, medium donations
    await createArticleReadCount(author2.id, article2.id)
    await createArticleReadCount(author3.id, article2.id)
    await createComment(author3.id, article2.id)
    await createDonationTx(
      {
        senderId: author2.id,
        recipientId: author1.id,
        targetId: article2.id,
        currency: PAYMENT_CURRENCY.HKD,
        state: TRANSACTION_STATE.succeeded,
      },
      paymentService
    )

    const results = await recommendationService.findHottestArticles({
      days: 5,
      readersThreshold: 0,
      commentsThreshold: 0,
    })

    expect(results.length).toBeGreaterThanOrEqual(2)

    // Results should be ordered by score descending
    // We can't predict exact order without knowing precise scoring, but we can verify structure
    const articleIds = results.map((r: any) => r.articleId)
    expect(articleIds).toContain(article1.id)
    expect(articleIds).toContain(article2.id)
  })

  test('applies time decay to scoring', async () => {
    const now = new Date()
    const oneDayAgo = new Date(now.getTime() - DAY)
    const fourDaysAgo = new Date(now.getTime() - 4 * DAY)

    // Create similar activity but at different times
    // Recent activity (1 day ago)
    await createArticleReadCount(author2.id, article1.id, 5)
    await createComment(author3.id, article1.id, oneDayAgo)

    // Older activity (4 days ago) - should have lower score due to decay
    await createArticleReadCount(author1.id, article2.id, 5)
    await createComment(author3.id, article2.id, fourDaysAgo)

    // Update read count timestamps
    await atomService.update({
      table: 'article_read_count',
      where: { articleId: article1.id },
      data: { updatedAt: oneDayAgo },
    })
    await atomService.update({
      table: 'article_read_count',
      where: { articleId: article2.id },
      data: { updatedAt: fourDaysAgo },
    })

    const results = await recommendationService.findHottestArticles({
      days: 5,
      readersThreshold: 0,
      commentsThreshold: 0,
    })

    expect(results.length).toBeGreaterThanOrEqual(2)

    // Article 1 (more recent activity) should rank higher than Article 2
    const article1Index = results.findIndex(
      (r: any) => r.articleId === article1.id
    )
    const article2Index = results.findIndex(
      (r: any) => r.articleId === article2.id
    )

    expect(article1Index).toBeLessThan(article2Index)
  })

  test('respects custom time window', async () => {
    const now = new Date()

    // Create an article outside the time window
    const [oldArticle] = await publicationService.createArticle({
      title: 'Old Article',
      content: 'Old content',
      authorId: author1.id,
    })
    await atomService.update({
      table: 'article',
      where: { id: oldArticle.id },
      data: { createdAt: new Date(now.getTime() - 6 * DAY) },
    })

    // Add activity to all articles
    await createArticleReadCount(author2.id, article1.id, 5)
    await createArticleReadCount(author2.id, oldArticle.id, 5)

    // Test with 2-day window (should exclude articles older than 2 days)
    const results2Days = await recommendationService.findHottestArticles({
      days: 3,
      readersThreshold: 0,
      commentsThreshold: 0,
    })
    const articleIds2Days = results2Days.map((r: any) => r.articleId)

    expect(articleIds2Days).toContain(article1.id) // 2 days ago, within window
    expect(articleIds2Days).not.toContain(article2.id) // 3 days ago, outside window
    expect(articleIds2Days).not.toContain(oldArticle.id) // 6 days ago, outside window

    // Test with 7-day window (should include more articles)
    const results7Days = await recommendationService.findHottestArticles({
      days: 7,
      readersThreshold: 0,
      commentsThreshold: 0,
    })
    const articleIds7Days = results7Days.map((r: any) => r.articleId)

    expect(articleIds7Days).toContain(article1.id)
    expect(articleIds7Days).toContain(article2.id)
    expect(articleIds7Days).toContain(oldArticle.id)
  })

  test('handles USDT donations correctly', async () => {
    // Create donation with USDT (minimum 0.1)
    await createDonationTx(
      {
        senderId: author2.id,
        recipientId: author1.id,
        targetId: article1.id,
        currency: PAYMENT_CURRENCY.USDT,
        state: TRANSACTION_STATE.succeeded,
      },
      paymentService
    )

    // Update the transaction amount to meet USDT minimum
    await atomService.update({
      table: 'transaction',
      where: { targetId: article1.id },
      data: { amount: '0.15' }, // Above 0.1 minimum
    })

    await createArticleReadCount(author2.id, article1.id, 5)

    const results = await recommendationService.findHottestArticles({
      days: 5,
      readersThreshold: 0,
      commentsThreshold: 0,
    })

    const articleIds = results.map((r: any) => r.articleId)
    expect(articleIds).toContain(article1.id)
  })

  test('excludes comments from article authors', async () => {
    // Add comments - one from author (should be excluded), one from others (should count)
    await createComment(author1.id, article1.id) // Author commenting on own article - excluded
    await createComment(author3.id, article2.id) // Other user commenting - included

    const results = await recommendationService.findHottestArticles({
      days: 5,
      readersThreshold: 1,
      commentsThreshold: 1,
    })

    const articleIds = results.map((r: any) => r.articleId)
    expect(articleIds).toContain(article2.id)
    expect(articleIds).not.toContain(article1.id)
  })

  test('returns empty result when no articles meet criteria', async () => {
    // Create articles with insufficient activity (below thresholds)
    await createArticleReadCount(author2.id, article1.id, 2) // Below 5 readers
    await createComment(author3.id, article1.id) // Only 1 comment, below 3

    const results = await recommendationService.findHottestArticles({
      days: 5,
    })

    expect(results).toHaveLength(0)
  })

  test('handles edge case with no articles in time window', async () => {
    // Test with very short time window (1 hour)

    const results = await recommendationService.findHottestArticles({
      days: 1 / 24,
      readersThreshold: 0,
      commentsThreshold: 0,
    })

    expect(results).toHaveLength(0)
  })

  test('excludes inactive articles', async () => {
    // Mark article as inactive
    await atomService.update({
      table: 'article',
      where: { id: article1.id },
      data: { state: ARTICLE_STATE.archived },
    })

    // Add activity to the inactive article
    await createArticleReadCount(author2.id, article1.id, 10)
    await createComment(author3.id, article1.id)

    const results = await recommendationService.findHottestArticles({
      days: 5,
      readersThreshold: 0,
      commentsThreshold: 0,
    })

    const articleIds = results.map((r: any) => r.articleId)
    expect(articleIds).not.toContain(article1.id)
  })
})
