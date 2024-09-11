import type { Article, Connections } from 'definitions'

import { v4 } from 'uuid'

import {
  COMMENT_STATE,
  NODE_TYPES,
  APPRECIATION_TYPES,
  ARTICLE_APPRECIATE_LIMIT,
  FEATURE_NAME,
  FEATURE_FLAG,
} from 'common/enums'
import {
  ArticleService,
  UserWorkService,
  AtomService,
  SystemService,
} from 'connectors'

import { genConnections, closeConnections } from './utils'
import { ClassificationService } from 'connectors/article/classification'
import { Classification } from 'connectors/classification/manager'
import {
  ArticleClassificationFactory,
  ArticleContentFactory,
  ArticleFactory,
  ArticleVersionFactory,
  Factory,
} from './factories'
import { environment } from 'common/environment'

let connections: Connections
let articleService: ArticleService
let atomService: AtomService
let systemService: SystemService

beforeAll(async () => {
  connections = await genConnections()
  articleService = new ArticleService(connections)
  atomService = new AtomService(connections)
  systemService = new SystemService(connections)
}, 30000)

afterAll(async () => {
  await closeConnections(connections)
})

describe('create', () => {
  test('default values', async () => {
    const [article, articleVersion] = await articleService.createArticle({
      authorId: '1',
      title: 'test',
      cover: '1',
      content: '<div>test-html-string</div>',
    })
    expect(article.state).toBe('active')
    expect(articleVersion.indentFirstLine).toBe(false)
  })
  test('indent', async () => {
    const [, articleVersion] = await articleService.createArticle({
      authorId: '1',
      title: 'test',
      cover: '1',
      content: '<div>test-html-string</div>',
      indentFirstLine: true,
    })
    expect(articleVersion.indentFirstLine).toBe(true)
  })

  it('classifies the article content', async () => {
    const service = {
      classify: jest.fn(),
    } as jest.Mocked<ClassificationService>
    const articles = new ArticleService(connections, service)
    await articles.createArticle({
      authorId: '1',
      title: 'greeting',
      content: 'Hello, world!',
    })
    expect(service.classify).toHaveBeenCalled()
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
  test('excludeRestricted', async () => {
    const articles = await articleService.findByAuthor('1', {
      excludeRestricted: true,
    })
    expect(articles.length).toBeDefined()

    await atomService.create({
      table: 'article_recommend_setting',
      data: { articleId: articles[0].id, inNewest: true, inHottest: false },
    })
    const excluded = await articleService.findByAuthor('1', {
      excludeRestricted: true,
    })
    expect(excluded).not.toContain(articles[0])
  })
})

test('findByCommentedAuthor', async () => {
  const articles = await articleService.findByCommentedAuthor({ id: '1' })
  expect(articles.length).toBeDefined()
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

test('findSubscriptions', async () => {
  const subs = await articleService.findSubscriptions({ id: '2' })
  expect(subs.length).toEqual(2)
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

describe('search', () => {
  test('exclude articles in article_recommend_setting table', async () => {
    const { nodes } = await articleService.search({
      key: '1',
      take: 1,
      skip: 0,
    })
    expect(nodes.length).toBe(1)

    await atomService.create({
      table: 'article_recommend_setting',
      data: { articleId: nodes[0].id, inSearch: false },
    })

    const { nodes: excluded } = await articleService.search({
      key: '1',
      take: 1,
      skip: 0,
    })
    expect(nodes.length).toBe(1)

    expect(excluded.length).toBe(0)
  })
})

describe('quicksearch', () => {
  test('search by title', async () => {
    const { nodes, totalCount } = await articleService.searchV3({
      key: 'test',
      take: 1,
      skip: 0,
      quicksearch: true,
    })
    expect(nodes.length).toBe(1)
    expect(totalCount).toBeGreaterThan(0)

    // both case insensitive and Chinese simplified/traditional insensitive
    await articleService.createArticle({
      title: 'Uppercase',
      content: '',
      authorId: '1',
    })
    const { nodes: nodes2 } = await articleService.searchV3({
      key: 'uppercase',
      take: 1,
      skip: 0,
      quicksearch: true,
    })
    expect(nodes2.length).toBe(1)

    await articleService.createArticle({
      title: '測試',
      content: '',
      authorId: '1',
    })
    const { nodes: nodes3 } = await articleService.searchV3({
      key: '测试',
      take: 1,
      skip: 0,
      quicksearch: true,
    })
    expect(nodes3.length).toBe(1)

    await articleService.createArticle({
      title: '试测',
      content: '',
      authorId: '1',
    })
    const { nodes: nodes4 } = await articleService.searchV3({
      key: '試測',
      take: 1,
      skip: 0,
      quicksearch: true,
    })
    expect(nodes4.length).toBe(1)

    await articleService.createArticle({
      title: '測测',
      content: '',
      authorId: '1',
    })
    const { nodes: nodes5 } = await articleService.searchV3({
      key: '測测',
      take: 1,
      skip: 0,
      quicksearch: true,
    })
    expect(nodes5.length).toBe(1)

    // mixed case will not match in current implementation
    const { nodes: nodes6 } = await articleService.searchV3({
      key: '测測',
      take: 1,
      skip: 0,
      quicksearch: true,
    })
    expect(nodes6.length).toBe(0)
  })
  test('filter by authorId', async () => {
    const { nodes } = await articleService.searchV3({
      key: 'test',
      take: 10,
      skip: 0,
      quicksearch: true,
      filter: { authorId: '2' },
    })
    nodes.forEach((node) => {
      expect(node.authorId).toBe('2')
    })
  })
  test('exclude articles in article_recommend_setting table', async () => {
    const [article] = await articleService.createArticle({
      title: 'test article_recommend_setting',
      content: '',
      authorId: '1',
    })
    const { nodes: nodes } = await articleService.searchV3({
      key: 'article_recommend_setting',
      take: 1,
      skip: 0,
      quicksearch: true,
    })
    expect(nodes.length).toBe(1)
    expect(nodes[0].id).toBe(article.id)

    await atomService.create({
      table: 'article_recommend_setting',
      data: { articleId: article.id, inSearch: false },
    })

    const { nodes: excluded } = await articleService.searchV3({
      key: 'article_recommend_setting',
      take: 1,
      skip: 0,
      quicksearch: true,
    })
    expect(excluded.length).toBe(0)
  })
  test('spam are excluded', async () => {
    const [article] = await articleService.createArticle({
      title: 'test spam',
      content: '',
      authorId: '1',
    })
    const { nodes: nodes } = await articleService.searchV3({
      key: 'spam',
      take: 1,
      skip: 0,
      quicksearch: true,
    })
    expect(nodes.length).toBe(1)
    expect(nodes[0].id).toBe(article.id)

    const spamThreshold = 0.5
    await systemService.setFeatureFlag({
      name: FEATURE_NAME.spam_detection,
      flag: FEATURE_FLAG.on,
      value: spamThreshold,
    })

    await atomService.update({
      table: 'article',
      where: { id: article.id },
      data: { spamScore: spamThreshold + 0.1 },
    })
    const { nodes: excluded } = await articleService.searchV3({
      key: 'spam',
      take: 1,
      skip: 0,
      quicksearch: true,
    })
    expect(excluded.length).toBe(0)
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
    const articles = await articleService.latestArticles({
      maxTake: 500,
      skip: 0,
      take: 10,
      oss: false,
    })
    expect(articles.length).toBeGreaterThan(0)
    expect(articles[0].id).toBeDefined()
    expect(articles[0].authorId).toBeDefined()
    expect(articles[0].state).toBeDefined()
  })
  test('spam are excluded', async () => {
    const articles = await articleService.latestArticles({
      maxTake: 500,
      skip: 0,
      take: 10,
      oss: false,
    })
    const spamThreshold = 0.5
    await systemService.setFeatureFlag({
      name: FEATURE_NAME.spam_detection,
      flag: FEATURE_FLAG.on,
      value: spamThreshold,
    })
    // spam flag is on but no detected articles
    const articles1 = await articleService.latestArticles({
      maxTake: 500,
      skip: 0,
      take: 10,
      oss: false,
    })
    expect(articles1).toEqual(articles)

    // spam detected
    await atomService.update({
      table: 'article',
      where: { id: articles[0].id },
      data: { spamScore: spamThreshold + 0.1 },
    })
    const articles2 = await articleService.latestArticles({
      maxTake: 500,
      skip: 0,
      take: 10,
      oss: false,
    })
    expect(articles2.map(({ id }) => id)).not.toContain(articles[0].id)

    // mark as not spam
    await atomService.update({
      table: 'article',
      where: { id: articles[0].id },
      data: { isSpam: false },
    })
    const articles3 = await articleService.latestArticles({
      maxTake: 500,
      skip: 0,
      take: 10,
      oss: false,
    })
    expect(articles3.map(({ id }) => id)).toContain(articles[0].id)

    // ham detected
    await atomService.update({
      table: 'article',
      where: { id: articles[1].id },
      data: { spamScore: spamThreshold - 0.1 },
    })
    const articles4 = await articleService.latestArticles({
      maxTake: 500,
      skip: 0,
      take: 10,
      oss: false,
    })
    expect(articles4.map(({ id }) => id)).toContain(articles[1].id)

    // mark as spam
    await atomService.update({
      table: 'article',
      where: { id: articles[1].id },
      data: { isSpam: true },
    })
    const articles5 = await articleService.latestArticles({
      maxTake: 500,
      skip: 0,
      take: 10,
      oss: false,
    })
    expect(articles5.map(({ id }) => id)).not.toContain(articles[1].id)
  })

  describe('classification', () => {
    beforeAll(() => {
      Factory.setConnections(connections)
      environment.latestFeedStrictFiltering = true
    })

    let mockHash = 0

    const setFilterInappropriateContent = async (filter = true) => {
      await systemService.setFeatureFlag({
        name: FEATURE_NAME.filter_inappropriate_content_in_latest_feed,
        flag: filter ? FEATURE_FLAG.on : FEATURE_FLAG.off,
      })
    }

    it('includes normal articles', async () => {
      setFilterInappropriateContent(true)
      const html = '<p>foo.</p>'
      const content = await new ArticleContentFactory().create({
        content: html,
        hash: `test-latest-articles-classification-${mockHash++}`,
      })
      const article = await new ArticleFactory().create({
        authorId: '1',
      })
      const version = await new ArticleVersionFactory().create({
        articleId: article.id,
        contentId: content.id,
        wordCount: html.length,
      })
      await new ArticleClassificationFactory().create({
        articleVersionId: version.id,
        classification: Classification.NORMAL,
      })
      const latests = await articleService.latestArticles({
        maxTake: 10,
        skip: 0,
        take: 10,
        oss: false,
      })
      expect(latests.some((entry: Article) => entry.id === article.id)).toBe(
        true
      )
    })

    it('excludes spam', async () => {
      setFilterInappropriateContent(true)
      const html = '<p>foo.</p>'
      const content = await new ArticleContentFactory().create({
        content: html,
        hash: `test-latest-articles-classification-${mockHash++}`,
      })
      const article = await new ArticleFactory().create({
        authorId: '1',
      })
      const version = await new ArticleVersionFactory().create({
        articleId: article.id,
        contentId: content.id,
        wordCount: html.length,
      })
      await new ArticleClassificationFactory().create({
        articleVersionId: version.id,
        classification: Classification.SPAM,
      })
      const latests = await articleService.latestArticles({
        maxTake: 10,
        skip: 0,
        take: 10,
        oss: false,
      })
      expect(latests.some((entry: Article) => entry.id === article.id)).toBe(
        false
      )
    })

    it('should not filter spam if feature is off', async () => {
      setFilterInappropriateContent(false)
      const html = '<p>foo.</p>'
      const content = await new ArticleContentFactory().create({
        content: html,
        hash: `test-latest-articles-classification-${mockHash++}`,
      })
      const article = await new ArticleFactory().create({
        authorId: '1',
      })
      const version = await new ArticleVersionFactory().create({
        articleId: article.id,
        contentId: content.id,
        wordCount: html.length,
      })
      await new ArticleClassificationFactory().create({
        articleVersionId: version.id,
        classification: Classification.SPAM,
      })
      const latests = await articleService.latestArticles({
        maxTake: 10,
        skip: 0,
        take: 10,
        oss: false,
      })
      expect(latests.some((entry: Article) => entry.id === article.id)).toBe(
        true
      )
    })

    it('should exclude unclassified articles in strict mode', async () => {
      setFilterInappropriateContent(true)
      const article = await new ArticleFactory().create({
        authorId: '1',
      })
      const latests = await articleService.latestArticles({
        maxTake: 10,
        skip: 0,
        take: 10,
        oss: false,
      })
      expect(latests.some((entry: Article) => entry.id === article.id)).toBe(
        false
      )
    })

    it('should include unclassified articles when not in strict mode', async () => {
      setFilterInappropriateContent(true)
      environment.latestFeedStrictFiltering = false
      const article = await new ArticleFactory().create({
        authorId: '1',
      })
      const latests = await articleService.latestArticles({
        maxTake: 10,
        skip: 0,
        take: 10,
        oss: false,
      })
      expect(latests.some((entry: Article) => entry.id === article.id)).toBe(
        true
      )
    })
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
  await articleService.createNewArticleVersion('1', '1', { content: 'test2' })
  const count2 = await articleService.countArticleVersions('1')
  expect(count2).toBe(2)
})

describe('createNewArticleVersion', () => {
  test('provide description or not', async () => {
    const articleVersion = await articleService.createNewArticleVersion(
      '1',
      '1',
      { canComment: false }
    )
    expect(articleVersion.description).toBe(null)

    const articleVersion2 = await articleService.createNewArticleVersion(
      '1',
      '1',
      { canComment: false },
      undefined
    )
    expect(articleVersion2.description).toBe(null)

    const description = 'test desc'
    const articleVersion3 = await articleService.createNewArticleVersion(
      '1',
      '1',
      { canComment: false },
      description
    )
    expect(articleVersion3.description).toBe(description)
  })

  it('classifies the article content', async () => {
    const service = {
      classify: jest.fn(),
    } as jest.Mocked<ClassificationService>
    const articles = new ArticleService(connections, service)
    await articles.createNewArticleVersion(
      '1',
      '1',
      { content: 'foo' },
      'description'
    )
    expect(service.classify).toHaveBeenCalled()
  })
})

describe('findArticleVersions', () => {
  test('return content change versions', async () => {
    const [, count1] = await articleService.findArticleVersions('2')
    expect(count1).toBeGreaterThan(0)

    const changedContent = 'text change'
    await articleService.createNewArticleVersion('2', '2', {
      content: changedContent,
    })
    const [, count2] = await articleService.findArticleVersions('2')
    expect(count2).toBe(count1 + 1)

    await articleService.createNewArticleVersion('2', '2', {
      title: 'new title',
    })
    const [, count3] = await articleService.findArticleVersions('2')
    expect(count3).toBe(count2 + 1)

    await articleService.createNewArticleVersion('2', '2', {
      summary: 'new summary',
    })
    const [, count4] = await articleService.findArticleVersions('2')
    expect(count4).toBe(count3 + 1)

    await articleService.createNewArticleVersion('2', '2', { cover: '1' })
    const [, count5] = await articleService.findArticleVersions('2')
    expect(count5).toBe(count4 + 1)

    await articleService.createNewArticleVersion('2', '2', {
      tags: ['new tags'],
    })
    const [, count6] = await articleService.findArticleVersions('2')
    expect(count6).toBe(count5 + 1)

    await articleService.createNewArticleVersion('2', '2', {
      collection: ['1'],
    })
    const [, count7] = await articleService.findArticleVersions('2')
    expect(count7).toBe(count6 + 1)

    // create new version with no content change
    await articleService.createNewArticleVersion('2', '2', {
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
    await articleService._detectSpam(
      { id: articleId, title: 'test', content: 'test' },
      mockSpamDetoctor as any
    )

    const article = await atomService.findUnique({
      table: 'article',
      where: { id: articleId },
    })
    expect(article?.spamScore).toBe(score)
  })
  test('find and count spam articles', async () => {
    const [_, count] = await articleService.findAndCountArticles({
      take: 10,
      skip: 0,
      filter: { isSpam: true },
    })
    expect(count).toBeGreaterThan(0)
  })
})
