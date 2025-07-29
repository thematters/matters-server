import type { Connections } from '#definitions/index.js'

import { v4 } from 'uuid'
import { jest } from '@jest/globals'

import {
  COMMENT_STATE,
  NODE_TYPES,
  APPRECIATION_TYPES,
  ARTICLE_APPRECIATE_LIMIT,
  FEATURE_NAME,
  FEATURE_FLAG,
  PUBLISH_STATE,
  USER_STATE,
  USER_RESTRICTION_TYPE,
} from '#common/enums/index.js'
import { ArticleService } from '../../article/articleService.js'
import { PublicationService } from '../../article/publicationService.js'
import { AtomService } from '../../atomService.js'
import { CampaignService } from '../../campaignService.js'
import { ChannelService } from '../../channel/channelService.js'
import { SystemService } from '../../systemService.js'
import { UserService } from '../../userService.js'
import { UserWorkService } from '../../userWorkService.js'
import { environment } from '#common/environment.js'

import { genConnections, closeConnections, createCampaign } from '../utils.js'

let connections: Connections
let articleService: ArticleService
let publicationService: PublicationService
let channelService: ChannelService
let atomService: AtomService
let systemService: SystemService
let userService: UserService
let campaignService: CampaignService

beforeAll(async () => {
  connections = await genConnections()
  articleService = new ArticleService(connections)
  publicationService = new PublicationService(connections)
  channelService = new ChannelService(connections)
  atomService = new AtomService(connections)
  systemService = new SystemService(connections)
  userService = new UserService(connections)
  campaignService = new CampaignService(connections)
}, 30000)

afterAll(async () => {
  await closeConnections(connections)
})

describe('create', () => {
  test('default values', async () => {
    const [article, articleVersion] = await publicationService.createArticle({
      authorId: '1',
      title: 'test',
      cover: '1',
      content: '<div>test-html-string</div>',
    })
    expect(article.state).toBe('active')
    expect(articleVersion.indentFirstLine).toBe(false)
  })
  test('indent', async () => {
    const [, articleVersion] = await publicationService.createArticle({
      authorId: '1',
      title: 'test',
      cover: '1',
      content: '<div>test-html-string</div>',
      indentFirstLine: true,
    })
    expect(articleVersion.indentFirstLine).toBe(true)
  })
})

describe('appreciation', () => {
  test('bundle', async () => {
    const appreciation = await articleService.appreciate({
      articleId: '1',
      senderId: '4',
      amount: 1,
      recipientId: '1',
      type: APPRECIATION_TYPES.like,
    })
    expect(appreciation[0].amount).toBe(1)

    const bundled1 = await articleService.appreciate({
      articleId: '1',
      senderId: '4',
      amount: 1,
      recipientId: '1',
      type: APPRECIATION_TYPES.like,
    })
    expect(bundled1[0].amount).toBe(2)

    // can not appreciate more than limit
    const bundled2 = await articleService.appreciate({
      articleId: '1',
      senderId: '4',
      amount: ARTICLE_APPRECIATE_LIMIT + 1,
      recipientId: '1',
      type: APPRECIATION_TYPES.like,
    })
    expect(bundled2[0].amount).toBe(ARTICLE_APPRECIATE_LIMIT)
  })

  test('can not appreciate more than limit', async () => {
    const appreciation = await articleService.appreciate({
      articleId: '1',
      senderId: '5',
      amount: ARTICLE_APPRECIATE_LIMIT + 1,
      recipientId: '1',
      type: APPRECIATION_TYPES.like,
    })
    expect(appreciation[0].amount).toBe(ARTICLE_APPRECIATE_LIMIT)

    // can not appreciate more than limit when call concurrently
    const [appreciation1, appreciation2] = await Promise.all([
      articleService.appreciate({
        articleId: '1',
        senderId: '5',
        amount: ARTICLE_APPRECIATE_LIMIT - 1,
        recipientId: '1',
        type: APPRECIATION_TYPES.like,
      }),
      articleService.appreciate({
        articleId: '1',
        senderId: '5',
        amount: ARTICLE_APPRECIATE_LIMIT - 1,
        recipientId: '1',
        type: APPRECIATION_TYPES.like,
      }),
    ])
    expect(appreciation1[0]?.amount ?? appreciation2[0]?.ammount).toBe(
      ARTICLE_APPRECIATE_LIMIT
    )
  })
  test('sumAppreciation', async () => {
    const appreciation = await articleService.sumAppreciation('1')
    expect(appreciation).toBeDefined()
  })
})

describe('findByAuthor', () => {
  test('order by created_at', async () => {
    const draftIds = await articleService.findByAuthor('1')
    expect(draftIds.length).toBeDefined()
  })
  test('order by num of readers', async () => {
    const articles = await articleService.findByAuthor('1', {
      orderBy: 'mostReaders',
    })
    expect(articles.length).toBeDefined()
    expect(articles[0].id).not.toBe('1')
    await connections.knex('article_ga4_data').insert({
      articleId: '1',
      totalUsers: '1',
      dateRange: '[2023-10-24,2023-10-24]',
    })
    const articles2 = await articleService.findByAuthor('1', {
      orderBy: 'mostReaders',
    })
    expect(articles2[0].id).toBe('1')
  })
  test('order by amount of appreciations', async () => {
    const articles = await articleService.findByAuthor('1', {
      orderBy: 'mostAppreciations',
    })
    expect(articles.length).toBeDefined()
  })
  test('order by num of comments', async () => {
    const articles = await articleService.findByAuthor('1', {
      orderBy: 'mostComments',
    })
    expect(articles.length).toBeDefined()
  })
  test('order by num of donations', async () => {
    const articles = await articleService.findByAuthor('1', {
      orderBy: 'mostDonations',
    })
    expect(articles.length).toBeDefined()
  })
  test('filter by state', async () => {
    const articles = await articleService.findByAuthor('1', {
      state: 'archived',
    })
    expect(articles.length).toBeDefined()
  })
})

test('findByCommentedAuthor', async () => {
  const articles = await articleService.findByCommentedAuthor({ id: '1' })
  expect(articles.length).toBeDefined()
})

describe('findArticles', () => {
  test('filter by datetime range with start only', async () => {
    const startDate = new Date('2024-01-01')
    const result = await articleService.findArticles({
      datetimeRange: { start: startDate },
    })
    expect(result.length).toBeGreaterThan(0)
    expect(result[0].createdAt.getTime()).toBeGreaterThanOrEqual(
      startDate.getTime()
    )
  })

  test('filter by datetime range with start and end', async () => {
    const startDate = new Date('2024-01-01')
    const endDate = new Date('2024-01-31')
    const result = await articleService.findArticles({
      datetimeRange: { start: startDate, end: endDate },
    })
    expect(result.length).toBe(0)
  })

  test('filter by spam and datetime range', async () => {
    const startDate = new Date('2024-01-01')
    const result = await articleService.findArticles({
      spam: {
        isSpam: true,
        spamThreshold: 0.5,
      },
      datetimeRange: { start: startDate },
    })
    expect(result.length).toBe(0)
  })
  test('excludeAuthorStates', async () => {
    const result1 = await articleService.findArticles({
      excludeAuthorStates: [],
    })
    expect(result1.length).toBeGreaterThan(0)
    const result2 = await articleService.findArticles({
      excludeAuthorStates: [USER_STATE.active],
    })
    expect(result2.length).toBe(0)
  })
  test('excludeRestrictedAuthors', async () => {
    const result1 = await articleService.findArticles({})
    expect(result1.length).toBeGreaterThan(0)
    const authorId = result1[0].authorId
    await atomService.create({
      table: 'user_restriction',
      data: {
        userId: authorId,
        type: USER_RESTRICTION_TYPE.articleHottest,
      },
    })
    const result2 = await articleService.findArticles({
      excludeRestrictedAuthors: USER_RESTRICTION_TYPE.articleNewest,
    })
    expect(result2.length).toBe(result1.length)
    const result3 = await articleService.findArticles({
      excludeRestrictedAuthors: USER_RESTRICTION_TYPE.articleHottest,
    })
    expect(result3.length).toBeLessThan(result1.length)
    const result4 = await articleService.findArticles({
      excludeRestrictedAuthors: USER_RESTRICTION_TYPE.articleHottest,
      excludeAuthorStates: [USER_STATE.active],
    })
    expect(result4.length).toBe(0)
    await atomService.deleteMany({ table: 'user_restriction' })
  })

  test('excludeComplaintAreaArticles', async () => {
    // Monkey patch the environment variable
    environment.ComplaintAreaArticleId = '1'

    // Get baseline articles without exclusion
    const result1 = await articleService.findArticles({})
    expect(result1.length).toBeGreaterThan(0)

    // Test without exclusion - should return same results
    const result2 = await articleService.findArticles({
      excludeComplaintAreaArticles: false,
    })
    expect(result2.length).toBe(result1.length)

    // Test with exclusion - should return same results if no complaint area connections exist
    const result3 = await articleService.findArticles({
      excludeComplaintAreaArticles: true,
    })
    expect(result3.length).toBe(result1.length)

    // Create test articles that will be connected to complaint area
    const [article1] = await publicationService.createArticle({
      title: 'Test Article 1',
      content: 'Test content 1',
      authorId: '1',
    })
    const [article2] = await publicationService.createArticle({
      title: 'Test Article 2',
      content: 'Test content 2',
      authorId: '1',
    })

    // Create connections to complaint area article (using environment default ID)
    await atomService.create({
      table: 'article_connection',
      data: {
        entranceId: article1.id,
        articleId: environment.ComplaintAreaArticleId, // Default complaint area article ID from environment
        order: 1,
      },
    })
    await atomService.create({
      table: 'article_connection',
      data: {
        entranceId: article2.id,
        articleId: environment.ComplaintAreaArticleId, // Default complaint area article ID from environment
        order: 1,
      },
    })

    // Test with exclusion - should exclude articles connected to complaint area
    const result4 = await articleService.findArticles({
      excludeComplaintAreaArticles: true,
    })
    expect(result4.length).toBeLessThan(result1.length + 2) // Should exclude the 2 new articles

    // Verify the excluded articles are not in the results
    const excludedArticleIds = result4.map((article) => article.id)
    expect(excludedArticleIds).not.toContain(article1.id)
    expect(excludedArticleIds).not.toContain(article2.id)

    // Test without exclusion - should include all articles
    const result5 = await articleService.findArticles({
      excludeComplaintAreaArticles: false,
    })
    const includedArticleIds = result5.map((article) => article.id)
    expect(includedArticleIds).toContain(article1.id)
    expect(includedArticleIds).toContain(article2.id)
  })
})

test('countAppreciations', async () => {
  expect(await articleService.countAppreciations('1')).toBe(5)
  expect(await articleService.countAppreciations('0')).toBe(0)
})

test('findAppreciations', async () => {
  const appreciations = await articleService.findAppreciations({
    referenceId: '1',
  })
  expect(appreciations.length).toBe(5)

  const appreciations2 = await articleService.findAppreciations({
    referenceId: '1',
    take: 1,
  })
  expect(appreciations2.length).toBe(1)
  expect(appreciations[0].totalCount).toBe('5')
})

test('findTagIds', async () => {
  const tagIds = await articleService.findTagIds({ id: '1' })
  expect(tagIds.length).toEqual(2)
})

describe('updatePinned', () => {
  test('invaild article id will throw error', async () => {
    await expect(articleService.updatePinned('999', '1', true)).rejects.toThrow(
      'Cannot find article'
    )
  })
  test('not author user id will throw error', async () => {
    await expect(articleService.updatePinned('1', '999', true)).rejects.toThrow(
      'Only author can pin article'
    )
  })
  test('success', async () => {
    const getArticleFromDb = async (id: string) =>
      atomService.findUnique({ table: 'article', where: { id } })
    const authorId = '2'
    const articles = await articleService.findByAuthor(authorId)
    const articleId = articles[0].id
    let article = await new ArticleService(connections).updatePinned(
      articleId,
      authorId,
      true
    )
    expect(article.pinned).toBe(true)
    expect((await getArticleFromDb(articleId)).pinned).toBe(true)
    article = await new ArticleService(connections).updatePinned(
      articleId,
      authorId,
      true
    )
    expect(article.pinned).toBe(true)
    expect((await getArticleFromDb(articleId)).pinned).toBe(true)
  })
  test('cannot toggle more than 3 works', async () => {
    const authorId = '1'
    const articles = await articleService.findByAuthor(authorId)

    expect(articles.length).toBeGreaterThan(3)

    await articleService.updatePinned(articles[0].id, authorId, true)
    await articleService.updatePinned(articles[1].id, authorId, true)
    await articleService.updatePinned(articles[2].id, authorId, true)

    const userWorkService = new UserWorkService(connections)
    const total = await userWorkService.totalPinnedWorks('1')
    expect(total).toBe(3)
    await expect(
      articleService.updatePinned(articles[3].id, '1', true)
    ).rejects.toThrow()
  })
})

test('countReaders', async () => {
  const count1 = await articleService.countReaders('1')
  expect(count1).toBeDefined()
  // count not exist articles' readers
  const count0 = await articleService.countReaders('0')
  expect(count0).toBe(0)
})

describe('latestArticles', () => {
  test('base', async () => {
    const articles = await articleService.findNewestArticles()
    expect(articles.length).toBeGreaterThan(0)
    expect(articles[0].id).toBeDefined()
    expect(articles[0].authorId).toBeDefined()
    expect(articles[0].state).toBeDefined()
  })
  test('spam are excluded', async () => {
    const articles = await articleService.findNewestArticles({
      spamThreshold: 0.5,
    })
    const spamThreshold = 0.5
    // spam flag is on but no detected articles
    const articles1 = await articleService.findNewestArticles({
      spamThreshold: 0.5,
    })
    expect(articles1).toEqual(articles)

    // spam detected
    await atomService.update({
      table: 'article',
      where: { id: articles[0].id },
      data: { spamScore: spamThreshold + 0.1 },
    })
    const articles2 = await articleService.findNewestArticles({
      spamThreshold: 0.5,
    })
    expect(articles2.map(({ id }) => id)).not.toContain(articles[0].id)

    // mark as not spam
    await atomService.update({
      table: 'article',
      where: { id: articles[0].id },
      data: { isSpam: false },
    })
    const articles3 = await articleService.findNewestArticles({
      spamThreshold: 0.5,
    })
    expect(articles3.map(({ id }) => id)).toContain(articles[0].id)

    // ham detected
    await atomService.update({
      table: 'article',
      where: { id: articles[1].id },
      data: { spamScore: spamThreshold - 0.1 },
    })
    const articles4 = await articleService.findNewestArticles({
      spamThreshold: 0.5,
    })
    expect(articles4.map(({ id }) => id)).toContain(articles[1].id)

    // mark as spam
    await atomService.update({
      table: 'article',
      where: { id: articles[1].id },
      data: { isSpam: true },
    })
    const articles5 = await articleService.findNewestArticles({
      spamThreshold: 0.5,
    })
    expect(articles5.map(({ id }) => id)).not.toContain(articles[1].id)
  })

  test('channel articles are excluded', async () => {
    const articleChannelThreshold = 0.5
    await systemService.setFeatureFlag({
      name: FEATURE_NAME.article_channel,
      flag: FEATURE_FLAG.on,
      value: articleChannelThreshold,
    })

    // create articles
    const [article1] = await publicationService.createArticle({
      title: 'test',
      content: 'test content 1',
      authorId: '1',
    })
    const [article2] = await publicationService.createArticle({
      title: 'test2',
      content: 'test content 2',
      authorId: '1',
    })
    const [article3] = await publicationService.createArticle({
      title: 'test3',
      content: 'test content 3',
      authorId: '1',
    })
    const [article4] = await publicationService.createArticle({
      title: 'test4',
      content: 'test content 4',
      authorId: '1',
    })

    // create child channels first
    const childChannel = await channelService.createTopicChannel({
      name: 'child',
      note: 'child channel',
      providerId: 'test-child',
      enabled: true,
    })

    const disabledChildChannel = await channelService.createTopicChannel({
      name: 'disabled-child',
      note: 'disabled child channel',
      providerId: 'test-disabled-child',
      enabled: false,
    })

    // create parent channel and establish parent-child relationships
    const parentChannel = await channelService.createTopicChannel({
      name: 'parent',
      note: 'parent channel',
      providerId: 'test-parent',
      enabled: true,
      subChannelIds: [childChannel.id, disabledChildChannel.id],
    })

    // create standalone disabled channel
    const disabledStandaloneChannel = await channelService.createTopicChannel({
      name: 'disabled-standalone',
      note: 'disabled standalone channel',
      providerId: 'test-disabled-standalone',
      enabled: false,
    })

    // create article channels
    await atomService.create({
      table: 'topic_channel_article',
      data: {
        articleId: article1.id,
        channelId: parentChannel.id,
        score: articleChannelThreshold + 0.1,
        enabled: true,
      },
    })
    await atomService.create({
      table: 'topic_channel_article',
      data: {
        articleId: article2.id,
        channelId: childChannel.id, // enabled child channel
        score: articleChannelThreshold + 0.1,
        enabled: true,
      },
    })
    await atomService.create({
      table: 'topic_channel_article',
      data: {
        articleId: article3.id,
        channelId: disabledChildChannel.id, // disabled child channel
        score: articleChannelThreshold + 0.1,
        enabled: true,
      },
    })
    await atomService.create({
      table: 'topic_channel_article',
      data: {
        articleId: article4.id,
        channelId: disabledStandaloneChannel.id, // disabled standalone channel
        score: articleChannelThreshold + 0.1,
        enabled: true,
      },
    })

    const articles = await articleService.findNewestArticles({
      excludeChannelArticles: false,
    })
    const articlesExcludedChannel = await articleService.findNewestArticles({
      excludeChannelArticles: true,
    })

    // All articles should be included when not excluding channel articles
    expect(articles.map(({ id }) => id)).toContain(article1.id)
    expect(articles.map(({ id }) => id)).toContain(article2.id)
    expect(articles.map(({ id }) => id)).toContain(article3.id)
    expect(articles.map(({ id }) => id)).toContain(article4.id)

    // When excluding channel articles:
    // - article1 should be excluded (parent channel is enabled)
    // - article2 should be excluded (child channel is enabled and parent is enabled)
    // - article3 should be excluded (child channel is disabled but parent is enabled)
    // - article4 should be included (standalone channel is disabled)
    expect(articlesExcludedChannel.map(({ id }) => id)).not.toContain(
      article1.id
    )
    expect(articlesExcludedChannel.map(({ id }) => id)).not.toContain(
      article2.id
    )
    expect(articlesExcludedChannel.map(({ id }) => id)).not.toContain(
      article3.id
    )
    expect(articlesExcludedChannel.map(({ id }) => id)).toContain(article4.id)
  })

  test('writing challenge articles are excluded', async () => {
    // Create test articles
    const [article1] = await publicationService.createArticle({
      title: 'test',
      content: 'test content 1',
      authorId: '1',
    })
    const [article2] = await publicationService.createArticle({
      title: 'test2',
      content: 'test content 2',
      authorId: '1',
    })

    // Create writing challenge campaign
    await createCampaign(campaignService, article1)

    // Test without exclusion
    const articles = await articleService.findNewestArticles({
      excludeExclusiveCampaignArticles: false,
    })
    expect(articles.map(({ id }) => id)).toContain(article1.id)
    expect(articles.map(({ id }) => id)).toContain(article2.id)

    // Test with exclusion
    const articlesExcluded = await articleService.findNewestArticles({
      excludeExclusiveCampaignArticles: true,
    })
    expect(articlesExcluded.map(({ id }) => id)).not.toContain(article1.id)
    expect(articlesExcluded.map(({ id }) => id)).toContain(article2.id)

    await atomService.deleteMany({ table: 'campaign_article' })
    await atomService.deleteMany({ table: 'campaign_user' })
    await atomService.deleteMany({ table: 'campaign_stage' })
    await atomService.deleteMany({ table: 'campaign' })
  })
})

describe('findResponses', () => {
  const createComment = async (
    state?: keyof typeof COMMENT_STATE,
    parentCommentId?: string
  ) => {
    return atomService.create({
      table: 'comment',
      data: {
        uuid: v4(),
        content: 'test',
        authorId: '1',
        targetId: '1',
        targetTypeId: '4',
        type: 'article',
        parentCommentId,
        state: state ?? COMMENT_STATE.active,
      },
    })
  }
  test('do not return archived comment not having any not-archived child comments', async () => {
    const res1 = await articleService.findResponses({ id: '1' })
    expect(res1.length).toBeGreaterThan(0)

    // active comment will be returned
    await createComment()
    const res2 = await articleService.findResponses({ id: '1' })
    expect(res2.length).toBe(res1.length + 1)

    // archived comment will not be returned
    const archived = await createComment(COMMENT_STATE.archived)
    const res3 = await articleService.findResponses({ id: '1' })
    expect(res3.length).toBe(res2.length)

    // archived comment w/o active/collapsed child comments will not be returned
    await createComment(COMMENT_STATE.archived, archived.id)
    await createComment(COMMENT_STATE.banned, archived.id)
    const res4 = await articleService.findResponses({ id: '1' })
    expect(res4.length).toBe(res3.length)

    // archived comment w active/collapsed child comments will be returned
    await createComment(COMMENT_STATE.active, archived.id)
    const res5 = await articleService.findResponses({ id: '1' })
    expect(res5.length).toBe(res4.length + 1)

    // banned comment will not be returned
    const banned = await createComment(COMMENT_STATE.archived)
    const res6 = await articleService.findResponses({ id: '1' })
    expect(res6.length).toBe(res5.length)

    // banned comment w/o active/collapsed child comments will not be returned
    await createComment(COMMENT_STATE.archived, banned.id)
    await createComment(COMMENT_STATE.banned, banned.id)
    const res7 = await articleService.findResponses({ id: '1' })
    expect(res7.length).toBe(res6.length)

    // banned comment w active/collapsed child comments will be returned
    await createComment(COMMENT_STATE.collapsed, banned.id)
    const res8 = await articleService.findResponses({ id: '1' })
    expect(res8.length).toBe(res7.length + 1)
  })
  test('count is right', async () => {
    const res = await articleService.findResponses({ id: '1' })
    expect(+res[0].totalCount).toBe(res.length)

    const res1 = await articleService.findResponses({ id: '1', first: 1 })
    expect(+res1[0].totalCount).toBe(res.length)
  })

  test('cursor works', async () => {
    const res = await articleService.findResponses({ id: '1' })
    const res1 = await articleService.findResponses({
      id: '1',
      after: { type: NODE_TYPES.Comment, id: res[0].entityId },
    })
    expect(res1.length).toBe(res.length - 1)
    expect(+res1[0].totalCount).toBe(res.length)
  })
})

test('loadLatestArticleVersion', async () => {
  const articleVersion = await articleService.loadLatestArticleVersion('1')
  expect(articleVersion.articleId).toBe('1')
})

test('countArticleVersions', async () => {
  const count = await articleService.countArticleVersions('1')
  expect(count).toBe(1)
  await publicationService.createNewArticleVersion('1', '1', {
    content: 'test2',
  })
  const count2 = await articleService.countArticleVersions('1')
  expect(count2).toBe(2)
})

describe('createNewArticleVersion', () => {
  test('provide description or not', async () => {
    const articleVersion = await publicationService.createNewArticleVersion(
      '1',
      '1',
      { canComment: false }
    )
    expect(articleVersion.description).toBe(null)

    const articleVersion2 = await publicationService.createNewArticleVersion(
      '1',
      '1',
      { canComment: false },
      undefined
    )
    expect(articleVersion2.description).toBe(null)

    const description = 'test desc'
    const articleVersion3 = await publicationService.createNewArticleVersion(
      '1',
      '1',
      { canComment: false },
      description
    )
    expect(articleVersion3.description).toBe(description)
  })
})

describe('findArticleVersions', () => {
  test('return content change versions', async () => {
    const [, count1] = await articleService.findArticleVersions('2')
    expect(count1).toBeGreaterThan(0)

    const changedContent = 'text change'
    await publicationService.createNewArticleVersion('2', '2', {
      content: changedContent,
    })
    const [, count2] = await articleService.findArticleVersions('2')
    expect(count2).toBe(count1 + 1)

    await publicationService.createNewArticleVersion('2', '2', {
      title: 'new title',
    })
    const [, count3] = await articleService.findArticleVersions('2')
    expect(count3).toBe(count2 + 1)

    await publicationService.createNewArticleVersion('2', '2', {
      summary: 'new summary',
    })
    const [, count4] = await articleService.findArticleVersions('2')
    expect(count4).toBe(count3 + 1)

    await publicationService.createNewArticleVersion('2', '2', { cover: '1' })
    const [, count5] = await articleService.findArticleVersions('2')
    expect(count5).toBe(count4 + 1)

    await publicationService.createNewArticleVersion('2', '2', {
      tags: ['new tags'],
    })
    const [, count6] = await articleService.findArticleVersions('2')
    expect(count6).toBe(count5 + 1)

    await publicationService.createNewArticleVersion('2', '2', {
      connections: ['1'],
    })
    const [, count7] = await articleService.findArticleVersions('2')
    expect(count7).toBe(count6 + 1)

    // create new version with no content change
    await publicationService.createNewArticleVersion('2', '2', {
      sensitiveByAuthor: true,
    })
    const [, count8] = await articleService.findArticleVersions('2')
    expect(count8).toBe(count7)
  })
})

describe('spam detection', () => {
  test('detect spam', async () => {
    const articleId = '1'

    const score = 0.99
    const mockSpamDetoctor = { detect: jest.fn(() => score) }
    // @ts-ignore
    await publicationService._detectSpam(
      { id: articleId, title: 'test', content: 'test' },
      mockSpamDetoctor as any
    )

    const article = await atomService.findUnique({
      table: 'article',
      where: { id: articleId },
    })
    expect(article?.spamScore).toBe(score)
  })
  test('find spam articles', async () => {
    const articles = await articleService.findArticles({
      spam: {
        isSpam: true,
        spamThreshold: 0.5,
      },
    })
    expect(articles.length).toBeGreaterThan(0)
  })
})

describe('addReadTimeColumn', () => {
  test('add read time column to articles query', async () => {
    const articlesQuery = connections
      .knex('article')
      .where({ authorId: '1' })
      .limit(3)
    const { query } = articleService.addReadTimeColumn(articlesQuery)
    const results = await query
    expect(results.length).toBe(3)
    expect(results[0].sumReadTime).toBe('0')
    expect(results[1].sumReadTime).toBe('0')
    expect(results[2].sumReadTime).toBe('0')
  })
})

describe('addArticleCountColumn', () => {
  test('adds article count column to authors query', async () => {
    // Create test users/authors
    const author1 = await userService.create()
    const author2 = await userService.create()
    const author3 = await userService.create()

    // Create articles for authors
    await Promise.all([
      publicationService.createArticle({
        authorId: author1.id,
        title: 'a1',
        content: 'content1',
      }),
      publicationService.createArticle({
        authorId: author1.id,
        title: 'a2',
        content: 'content2',
      }),
      publicationService.createArticle({
        authorId: author2.id,
        title: 'b1',
        content: 'content3',
      }),
      // author3 will have no articles
    ])

    // Create base authors query
    const authorsQuery = connections
      .knex('user')
      .select('id')
      .whereIn('id', [author1.id, author2.id, author3.id])

    // Add article count column
    const { query } = articleService.addArticleCountColumn(authorsQuery)

    // Execute query
    const results = await query.orderBy('id', 'asc')

    // Verify results
    expect(results).toHaveLength(3)
    expect(results[0].articleCount).toBe('2')
    expect(results[1].articleCount).toBe('1')
    expect(results[2].articleCount).toBe('0')
  })
})

describe('addReadCountColumn', () => {
  test('adds read count column to articles query', async () => {
    // Create test articles
    const [article1, article2, article3] = await atomService.findMany({
      table: 'article',
      where: { authorId: '1' },
      take: 3,
    })

    // Clean up any existing read counts
    await atomService.deleteMany({
      table: 'article_read_count',
    })

    // Create read counts for articles
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

    // Create base articles query
    const articlesQuery = connections
      .knex('article')
      .select('id')
      .whereIn('id', [article1.id, article2.id, article3.id])

    // Add read count column
    const { query } = articleService.addReadCountColumn(articlesQuery)

    // Execute query
    const results = await query.orderBy('id', 'asc')

    // Verify results
    expect(results).toHaveLength(3)

    expect(results[0].readCount).toBe('2')
    expect(results[1].readCount).toBe('1')
    expect(results[2].readCount).toBe('0')
  })
})

describe('findScheduledAndPublish', () => {
  test('publishes scheduled drafts', async () => {
    // Create a test draft with publish_at set
    const now = new Date()
    const pastDate = new Date(now.getTime() - 1000 * 60 * 60) // 1 hour in past

    // Insert test draft
    const draft = await atomService.create({
      table: 'draft',
      data: {
        authorId: '1',
        title: 'Test Scheduled Draft',
        content: 'Test content',
        publishState: 'unpublished',
        publishAt: pastDate,
      },
    })

    // Test publishing scheduled drafts with default lastHours (1)
    await publicationService.findScheduledAndPublish(now)

    // Verify the draft was updated to pending state
    const updatedDraft = await atomService.findUnique({
      table: 'draft',
      where: { id: draft.id },
    })
    expect(updatedDraft?.publishState).toBe(PUBLISH_STATE.published)
  })

  test('handles failed publishing', async () => {
    // Create a test draft with publish_at set
    const now = new Date()
    const pastDate = new Date(now.getTime() - 1000 * 60 * 60) // 1 hour in past

    // Insert test draft
    const draft = await atomService.create({
      table: 'draft',
      data: {
        authorId: '1',
        title: 'Test Failed Draft',
        content: 'Test content',
        publishState: 'unpublished',
        publishAt: pastDate,
      },
    })

    // Mock the publishArticle method to simulate failure
    const originalPublishArticle = publicationService.publishArticle
    publicationService.publishArticle = jest
      .fn()
      .mockImplementation(async (draftId: any) => {
        throw new Error('Publish failed')
      }) as any

    // Test publishing scheduled drafts with default lastHours (1)
    await publicationService.findScheduledAndPublish(now)

    // Verify the draft was updated to unpublished state after failure
    const updatedDraft = await atomService.findUnique({
      table: 'draft',
      where: { id: draft.id },
    })
    expect(updatedDraft?.publishState).toBe(PUBLISH_STATE.unpublished)

    // Restore original method
    publicationService.publishArticle = originalPublishArticle
  })

  test('respects lastHours parameter', async () => {
    // Create test drafts with different publish_at times
    const now = new Date()
    const pastDate1 = new Date(now.getTime() - 1000 * 60 * 60) // 1 hour in past
    const pastDate2 = new Date(now.getTime() - 1000 * 60 * 60 * 2) // 2 hours in past

    // Insert test drafts
    const draft1 = await atomService.create({
      table: 'draft',
      data: {
        authorId: '1',
        title: 'Test Draft 1',
        content: 'Test content 1',
        publishState: 'unpublished',
        publishAt: pastDate1,
      },
    })

    const draft2 = await atomService.create({
      table: 'draft',
      data: {
        authorId: '1',
        title: 'Test Draft 2',
        content: 'Test content 2',
        publishState: 'unpublished',
        publishAt: pastDate2,
      },
    })

    // Test publishing with lastHours=1 (should only publish draft1)
    await publicationService.findScheduledAndPublish(now, 1)

    // Verify only draft1 was published
    const updatedDraft1 = await atomService.findUnique({
      table: 'draft',
      where: { id: draft1.id },
    })
    const updatedDraft2 = await atomService.findUnique({
      table: 'draft',
      where: { id: draft2.id },
    })
    expect(updatedDraft1?.publishState).toBe(PUBLISH_STATE.published)
    expect(updatedDraft2?.publishState).toBe(PUBLISH_STATE.unpublished)

    // Test publishing with lastHours=2 (should publish both drafts)
    await publicationService.findScheduledAndPublish(now, 2)

    // Verify both drafts were published
    const finalDraft1 = await atomService.findUnique({
      table: 'draft',
      where: { id: draft1.id },
    })
    const finalDraft2 = await atomService.findUnique({
      table: 'draft',
      where: { id: draft2.id },
    })
    expect(finalDraft1?.publishState).toBe(PUBLISH_STATE.published)
    expect(finalDraft2?.publishState).toBe(PUBLISH_STATE.published)
  })
})
