import type { Connections } from 'definitions'

import { FEATURE_NAME, FEATURE_FLAG } from 'common/enums'
import {
  TagService,
  AtomService,
  ArticleService,
  UserService,
  SystemService,
} from 'connectors'

import { genConnections, closeConnections } from './utils'

let connections: Connections
let tagService: TagService
let atomService: AtomService
let articleService: ArticleService
let userService: UserService
let systemService: SystemService

beforeAll(async () => {
  connections = await genConnections()
  tagService = new TagService(connections)
  atomService = new AtomService(connections)
  articleService = new ArticleService(connections)
  userService = new UserService(connections)
  systemService = new SystemService(connections)
}, 30000)

afterAll(async () => {
  await closeConnections(connections)
})

test('countArticles', async () => {
  const count = await tagService.countArticles({ id: '2' })
  expect(count).toBeDefined()
})

describe('findArticleIds', () => {
  test('id', async () => {
    const articleIds = await tagService.findArticleIds({ id: '2' })
    expect(articleIds).toBeDefined()
  })
  test('excludeRestricted', async () => {
    const articleIds = await tagService.findArticleIds({
      id: '2',
      excludeRestricted: true,
    })
    expect(articleIds).toBeDefined()

    // create a restricted article
    await atomService.create({
      table: 'article_recommend_setting',
      data: { articleId: articleIds[0], inNewest: true },
    })
    const excluded1 = await tagService.findArticleIds({
      id: '2',
      excludeRestricted: true,
    })
    expect(excluded1).not.toContain(articleIds[0])

    // create a non-restricted article with record in article_recommend_setting
    await atomService.deleteMany({ table: 'article_recommend_setting' })
    await atomService.create({
      table: 'article_recommend_setting',
      data: { articleId: articleIds[0], inNewest: false, inHottest: false },
    })
    const excluded2 = await tagService.findArticleIds({
      id: '2',
      excludeRestricted: true,
    })
    expect(excluded2).toContain(articleIds[0])

    // create a restricted user
    await atomService.deleteMany({ table: 'article_recommend_setting' })
    const article = await atomService.findUnique({
      table: 'article',
      where: { id: articleIds[0] },
    })
    await atomService.create({
      table: 'user_restriction',
      data: { userId: article?.authorId, type: 'articleNewest' },
    })
    const excluded3 = await tagService.findArticleIds({
      id: '2',
      excludeRestricted: true,
    })
    expect(excluded3).not.toContain(articleIds[0])
    expect(excluded3).toContain(articleIds[1])
  })
  test('exclude spam', async () => {
    const articleIds = await tagService.findArticleIds({
      id: '2',
      excludeSpam: true,
    })
    expect(articleIds).toBeDefined()

    const spamThreshold = 0.5
    await systemService.setFeatureFlag({
      name: FEATURE_NAME.spam_detection,
      flag: FEATURE_FLAG.on,
      value: spamThreshold,
    })

    // spam flag is on but no detected articles
    const excluded1 = await tagService.findArticleIds({
      id: '2',
      excludeSpam: true,
    })
    expect(excluded1).toEqual(articleIds)

    // spam detected
    await atomService.update({
      table: 'article',
      where: { id: articleIds[0] },
      data: { spamScore: spamThreshold + 0.1 },
    })
    const excluded2 = await tagService.findArticleIds({
      id: '2',
      excludeSpam: true,
    })
    expect(excluded2).not.toContain(articleIds[0])
  })
})

test('findArticleCovers', async () => {
  const covers = await tagService.findArticleCovers({ id: '2' })
  expect(covers).toBeDefined()

  const cached = await tagService.findArticleCovers({ id: '2' })
  expect(cached).toEqual(covers)
})

test('create', async () => {
  const content = 'foo'
  const tag = await tagService.create(
    {
      content,
      creator: '0',
      editors: [],
      owner: '0',
    },
    {
      columns: ['id', 'content'],
    }
  )
  expect(tag.content).toEqual(content)
})

describe('search', () => {
  test('empty result', async () => {
    const res = await tagService.search({
      key: 'not-existed-tag',
      skip: 0,
      take: 10,
    })
    expect(res.totalCount).toBe(0)
  })
  test('prefer exact match', async () => {
    const res = await tagService.search({ key: 'tag', skip: 0, take: 10 })
    expect(res.totalCount).toBe(4)
    expect(res.nodes[0].content).toBe('tag')
  })
  test('prefer more articles', async () => {
    const res = await tagService.search({
      key: 't',
      skip: 0,
      take: 10,
      quicksearch: true,
    })
    expect(res.nodes?.[0]?.numArticles).toBeGreaterThanOrEqual(
      res.nodes?.[1]?.numArticles
    )
    expect(res.nodes?.[1]?.numArticles).toBeGreaterThanOrEqual(
      res.nodes?.[2]?.numArticles
    )
  })
  test('handle prefix #,＃', async () => {
    const res1 = await tagService.search({ key: '#tag', skip: 0, take: 10 })
    expect(res1.totalCount).toBe(4)
    expect(res1.nodes[0].content).toBe('tag')
    const res2 = await tagService.search({ key: '＃tag', skip: 0, take: 10 })
    expect(res2.totalCount).toBe(4)
    expect(res2.nodes[0].content).toBe('tag')
  })
  test('handle empty string', async () => {
    const res1 = await tagService.search({ key: '', skip: 0, take: 10 })
    expect(res1.totalCount).toBe(0)
    const res2 = await tagService.search({ key: '#', skip: 0, take: 10 })
    expect(res2.totalCount).toBe(0)
  })
  test('right totalCount with take and skip', async () => {
    const res1 = await tagService.search({
      key: 'tag',
      skip: 0,
      take: 10,
      quicksearch: true,
    })
    expect(res1.nodes.length).toBe(4)
    expect(res1.totalCount).toBe(4)
    const res2 = await tagService.search({
      key: 'tag',
      skip: 0,
      take: 1,
      quicksearch: true,
    })
    expect(res2.nodes.length).toBe(1)
    expect(res2.totalCount).toBe(4)
    const res3 = await tagService.search({
      key: 'tag',
      skip: 1,
      take: 10,
      quicksearch: true,
    })
    expect(res3.nodes.length).toBe(3)
    expect(res3.totalCount).toBe(4)
  })
})

describe('findByAuthorUsage', () => {
  test('find nothing', async () => {
    const user = await userService.create({
      userName: 'test-findByAuthorUsage1',
    })
    const [tags, totalCount] = await tagService.findByAuthorUsage({
      userId: user.id,
    })
    expect(tags.length).toBe(0)
    expect(totalCount).toBe(0)
  })
  test('find tags orders by usage', async () => {
    const user = await userService.create({
      userName: 'test-findByAuthorUsage2',
    })
    const [article1] = await articleService.createArticle({
      title: 'test',
      content: 'test',
      authorId: user.id,
    })
    const [article2] = await articleService.createArticle({
      title: 'test',
      content: 'test',
      authorId: user.id,
    })

    await tagService.createArticleTags({
      articleIds: [article1.id],
      creator: article1.authorId,
      tagIds: ['1', '2'],
    })
    await tagService.createArticleTags({
      articleIds: [article2.id],
      creator: article2.authorId,
      tagIds: ['2', '3'],
    })

    const [tags, totalCount] = await tagService.findByAuthorUsage({
      userId: user.id,
    })
    expect(tags[0].id).toBe('2')
    expect(totalCount).toBe(3)

    // test pagination
    const [tags2, totalCount2] = await tagService.findByAuthorUsage({
      userId: user.id,
      take: 1,
      skip: 1,
    })
    expect(tags2[0].id).toBe('3')
    expect(tags2.length).toBe(1)
    expect(totalCount2).toBe(3)
  })
})
