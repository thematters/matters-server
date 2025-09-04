import type { Connections } from '#definitions/index.js'

import { PublicationService } from '../article/publicationService.js'
import { MomentService } from '../momentService.js'
import { UserService } from '../userService.js'
import { UserWorkService } from '../userWorkService.js'
import { TagService } from '../tagService.js'
import { genConnections, closeConnections } from './utils.js'

let connections: Connections
let userWorkService: UserWorkService
let userService: UserService
let momentService: MomentService
let publicationService: PublicationService
let tagService: TagService

beforeAll(async () => {
  connections = await genConnections()
  userWorkService = new UserWorkService(connections)
  userService = new UserService(connections)
  momentService = new MomentService(connections)
  publicationService = new PublicationService(connections)
  tagService = new TagService(connections)
}, 30000)

afterAll(async () => {
  await closeConnections(connections)
})

describe('totalPinnedWorks', () => {
  test('get 0 pinned works', async () => {
    const res = await userWorkService.totalPinnedWorks('1')
    expect(res).toBe(0)
  })
  test('get 1 pinned works', async () => {
    await connections
      .knex('collection')
      .insert({ authorId: '1', title: 'test', pinned: true })
    const res = await userWorkService.totalPinnedWorks('1')
    expect(res).toBe(1)
  })
})

describe('findWritingsByUser', () => {
  test('find nothing', async () => {
    const user = await userService.create({ userName: 'testFindWritings1' })
    const res = await userWorkService.findWritingsByUser(user.id)
    expect(res.length).toEqual(0)
  })
  test('find 1 record', async () => {
    const user = await userService.create({ userName: 'testFindWritings2' })
    const moment = await momentService.create({ content: 'test' }, user)
    const records = await userWorkService.findWritingsByUser(user.id)
    expect(records[0].id).toBe(moment.id)
    expect(records[0].type).toBe('Moment')
  })
  test('find multi records', async () => {
    const user = await userService.create({ userName: 'testFindWritings3' })
    await momentService.create({ content: 'test' }, user)
    await momentService.create({ content: 'test' }, user)
    await publicationService.createArticle({
      title: 'test',
      content: 'test',
      authorId: user.id,
    })

    const records = await userWorkService.findWritingsByUser(user.id)
    expect(records.length).toEqual(3)
  })
})

describe('findWritingsByTag', () => {
  test('find nothing', async () => {
    const tag = await tagService.upsert({
      content: `FindWritingsByTag-empty-${Date.now()}`,
      creator: '1',
    })
    const res1 = await userWorkService.findWritingsByTag(tag.id)
    expect(res1.length).toEqual(0)

    const res2 = await userWorkService.findWritingsByTag(tag.id, {
      flood: false,
    })
    expect(res2.length).toEqual(0)
  })

  test('returns moments and articles', async () => {
    const user = await userService.create({
      userName: `testFindWritingsByTag-user-${Date.now()}`,
    })
    const tag = await tagService.upsert({
      content: `FindWritingsByTag-mix-${Date.now()}`,
      creator: user.id,
    })

    const moment = await momentService.create(
      { content: 'tag-moment', tagIds: [tag.id] },
      user
    )
    const [article] = await publicationService.createArticle({
      title: 'tag-article',
      content: 'content',
      authorId: user.id,
    })
    await tagService.createArticleTags({
      articleIds: [article.id],
      tagIds: [tag.id],
      creator: user.id,
    })

    const records1 = await userWorkService.findWritingsByTag(tag.id)
    const records2 = await userWorkService.findWritingsByTag(tag.id, {
      flood: false,
    })
    const byId1 = new Map(records1.map((r: any) => [r.id, r]))
    const byId2 = new Map(records2.map((r: any) => [r.id, r]))

    expect(records1.length).toBe(2)
    expect(records2.length).toBe(2)
    expect(byId1.get(moment.id)?.type).toBe('Moment')
    expect(byId1.get(moment.id)?.pinned).toBe(false)
    expect(byId1.get(article.id)?.type).toBe('Article')
    expect(byId1.get(article.id)?.pinned).toBe(false)
    expect(byId2.get(moment.id)?.type).toBe('Moment')
    expect(byId2.get(moment.id)?.pinned).toBe(false)
    expect(byId2.get(article.id)?.type).toBe('Article')
    expect(byId2.get(article.id)?.pinned).toBe(false)
  })

  test('pinned articles appear first when ordered by created_at desc', async () => {
    const user = await userService.create({
      userName: `testFindWritingsByTag-order-${Date.now()}`,
    })
    const tag = await tagService.upsert({
      content: `FindWritingsByTag-order-${Date.now()}`,
      creator: user.id,
    })

    // Create two tagged articles
    const [a1] = await publicationService.createArticle({
      title: 'A1',
      content: 'c1',
      authorId: user.id,
    })
    const [a2] = await publicationService.createArticle({
      title: 'A2',
      content: 'c2',
      authorId: user.id,
    })
    await tagService.createArticleTags({
      articleIds: [a1.id, a2.id],
      tagIds: [tag.id],
      creator: user.id,
    })

    // Pin a2
    await tagService.putArticleTag({
      articleId: a2.id,
      tagId: tag.id,
      data: { pinned: true, pinnedAt: new Date() },
    })

    const ordered = await userWorkService
      .findWritingsByTag(tag.id)
      .orderBy('created_at', 'desc')

    expect(ordered.length).toBeGreaterThanOrEqual(2)
    expect(ordered[0].id).toBe(a2.id)
    expect(ordered[0].type).toBe('Article')
    expect(ordered[0].pinned).toBe(true)
  })

  test('anti-flood works', async () => {
    const user = await userService.create({
      userName: `testFindWritingsByTag-user-${Date.now()}`,
    })
    const tag = await tagService.upsert({
      content: `FindWritingsByTag-mix-${Date.now()}`,
      creator: user.id,
    })

    const moment1 = await momentService.create(
      { content: 'tag-moment', tagIds: [tag.id] },
      user
    )
    const moment2 = await momentService.create(
      { content: 'tag-moment2', tagIds: [tag.id] },
      user
    )
    await momentService.create(
      { content: 'tag-moment3', tagIds: [tag.id] },
      user
    )
    const [article] = await publicationService.createArticle({
      title: 'tag-article',
      content: 'content',
      authorId: user.id,
    })
    await tagService.createArticleTags({
      articleIds: [article.id],
      tagIds: [tag.id],
      creator: user.id,
    })

    const records1 = await userWorkService.findWritingsByTag(tag.id)
    const records2 = await userWorkService.findWritingsByTag(tag.id, {
      flood: false,
    })
    expect(records1.length).toBe(4)
    expect(records2.length).toBe(2)
    expect(records2.map(({ id }) => id)).toEqual([moment1.id, moment2.id])
  })
})
