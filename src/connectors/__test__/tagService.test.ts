import type { Connections } from '#definitions/index.js'

import { USER_FEATURE_FLAG_TYPE } from '#common/enums/index.js'
import { PublicationService } from '../article/publicationService.js'
import { AtomService } from '../atomService.js'
import { TagService } from '../tagService.js'
import { UserService } from '../userService.js'

import { genConnections, closeConnections } from './utils.js'

let connections: Connections
let tagService: TagService
let atomService: AtomService
let publicationService: PublicationService
let userService: UserService

beforeAll(async () => {
  connections = await genConnections()
  tagService = new TagService(connections)
  atomService = new AtomService(connections)
  publicationService = new PublicationService(connections)
  userService = new UserService(connections)
}, 30000)

afterAll(async () => {
  await closeConnections(connections)
})

test('countArticles', async () => {
  const count = await tagService.countArticles({ id: '2' })
  expect(count).toBeDefined()
})

describe('findArticles', () => {
  const toIds = (articles: { id: string }[]) => articles.map(({ id }) => id)
  test('id', async () => {
    const articles = await tagService.findArticles({ id: '2' })
    expect(articles).toBeDefined()
  })
  test('excludeRestricted', async () => {
    const articles = await tagService.findArticles({
      id: '2',
      excludeRestricted: true,
    })
    expect(articles).toBeDefined()

    // create a restricted user
    await atomService.deleteMany({ table: 'article_recommend_setting' })
    const article = await atomService.findUnique({
      table: 'article',
      where: { id: articles[0].id },
    })
    await atomService.create({
      table: 'user_restriction',
      data: { userId: article?.authorId, type: 'articleNewest' },
    })
    const excluded3 = await tagService.findArticles({
      id: '2',
      excludeRestricted: true,
    })
    expect(toIds(excluded3)).not.toContain(articles[0].id)
    expect(toIds(excluded3)).toContain(articles[1].id)
  })
  test('exclude spam', async () => {
    const spamThreshold = 0.5
    const articles = await tagService.findArticles({
      id: '2',
      spamThreshold,
    })
    expect(articles).toBeDefined()

    // spam flag is on but no detected articles
    const excluded1 = await tagService.findArticles({
      id: '2',
      spamThreshold,
    })
    expect(toIds(excluded1)).toEqual(toIds(articles))

    // spam detected
    const article = await atomService.update({
      table: 'article',
      where: { id: articles[0].id },
      data: { spamScore: spamThreshold + 0.1 },
    })
    const excluded2 = await tagService.findArticles({
      id: '2',
      spamThreshold,
    })
    expect(toIds(excluded2)).not.toContain(articles[0].id)

    // bypass spam detection
    await userService.updateFeatureFlags(article.authorId, [
      USER_FEATURE_FLAG_TYPE.bypassSpamDetection,
    ])
    const excluded3 = await tagService.findArticles({
      id: '2',
      spamThreshold,
    })
    expect(toIds(excluded3)).toContain(articles[0].id)
  })
})

test('create', async () => {
  const content = 'foo'
  const tag = await tagService.upsert({ content, creator: '0' })
  expect(tag.content).toEqual(content)
  // upsert should be idempotent and return same tag
  const tag2 = await tagService.upsert({ content, creator: '0' })
  expect(tag2.id).toEqual(tag.id)
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
    const [article1] = await publicationService.createArticle({
      title: 'test',
      content: 'test',
      authorId: user.id,
    })
    const [article2] = await publicationService.createArticle({
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

test('countMoments', async () => {
  const count = await tagService.countMoments({ id: '2' })
  expect(count).toBeDefined()
})

test('countAuthors', async () => {
  const count = await tagService.countAuthors({ id: '2' })
  expect(count).toBeDefined()
  expect(typeof count).toBe('number')
  expect(count).toBeGreaterThanOrEqual(0)
})
