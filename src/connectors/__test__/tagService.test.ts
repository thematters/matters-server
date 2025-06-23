import type { Connections } from '#definitions/index.js'

import {
  FEATURE_NAME,
  FEATURE_FLAG,
  USER_FEATURE_FLAG_TYPE,
} from '#common/enums/index.js'
import { PublicationService } from '../article/publicationService.js'
import { AtomService } from '../atomService.js'
import { SystemService } from '../systemService.js'
import { TagService } from '../tagService.js'
import { UserService } from '../userService.js'

import { genConnections, closeConnections } from './utils.js'

let connections: Connections
let tagService: TagService
let atomService: AtomService
let publicationService: PublicationService
let userService: UserService
let systemService: SystemService

beforeAll(async () => {
  connections = await genConnections()
  tagService = new TagService(connections)
  atomService = new AtomService(connections)
  publicationService = new PublicationService(connections)
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
    const article = await atomService.update({
      table: 'article',
      where: { id: articleIds[0] },
      data: { spamScore: spamThreshold + 0.1 },
    })
    const excluded2 = await tagService.findArticleIds({
      id: '2',
      excludeSpam: true,
    })
    expect(excluded2).not.toContain(articleIds[0])

    // bypass spam detection
    await userService.updateFeatureFlags(article.authorId, [
      USER_FEATURE_FLAG_TYPE.bypassSpamDetection,
    ])
    const excluded3 = await tagService.findArticleIds({
      id: '2',
      excludeSpam: true,
    })
    expect(excluded3).toContain(articleIds[0])
  })
})

test('create', async () => {
  const content = 'foo'
  const tag = await tagService.create(
    { content, creator: '0' },
    {
      columns: ['id', 'content'],
    }
  )
  expect(tag.content).toEqual(content)
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
