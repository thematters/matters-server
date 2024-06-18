import type { Connections } from 'definitions'

import {
  UserWorkService,
  UserService,
  JournalService,
  ArticleService,
} from 'connectors'
import { NODE_TYPES } from 'common/enums'
import { genConnections, closeConnections } from './utils'

let connections: Connections
let userWorkService: UserWorkService
let userService: UserService
let journalService: JournalService
let articleService: ArticleService

beforeAll(async () => {
  connections = await genConnections()
  userWorkService = new UserWorkService(connections)
  userService = new UserService(connections)
  journalService = new JournalService(connections)
  articleService = new ArticleService(connections)
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

describe('findWritings', () => {
  test('find nothing', async () => {
    const user = await userService.create({ userName: 'testFindWritings1' })
    const res = await userWorkService.findWritings(user.id, { take: 1 })
    expect(res).toEqual([[], 0, false])
  })
  test('find 1 record', async () => {
    const user = await userService.create({ userName: 'testFindWritings2' })
    const journal = await journalService.create({ content: 'test' }, user)
    const [records, totalCount, hasNextPage] =
      await userWorkService.findWritings(user.id, { take: 2 })
    expect(records[0].id).toBe(journal.id)
    expect(records[0].type).toBe('Journal')
    expect(totalCount).toBe(1)
    expect(hasNextPage).toBeFalsy()

    const [records1, totalCount1, hasNextPage1] =
      await userWorkService.findWritings(user.id, {
        take: 2,
        after: { type: NODE_TYPES.Journal, id: records[0].id },
      })
    expect(records1).toEqual([])
    expect(totalCount1).toBe(1)
    expect(hasNextPage1).toBeFalsy()
  })
  test('find multi records', async () => {
    const user = await userService.create({ userName: 'testFindWritings3' })
    const journal1 = await journalService.create({ content: 'test' }, user)
    const journal2 = await journalService.create({ content: 'test' }, user)
    const journal3 = await journalService.create({ content: 'test' }, user)
    const [article] = await articleService.createArticle({
      title: 'test',
      content: 'test',
      authorId: user.id,
    })

    const [records1, totalCount1, hasNextPage1] =
      await userWorkService.findWritings(user.id, { take: 2 })
    expect(records1[0].id).toBe(article.id)
    expect(records1[0].type).toBe(NODE_TYPES.Article)
    expect(records1[1].id).toBe(journal3.id)
    expect(records1[1].type).toBe(NODE_TYPES.Journal)
    expect(totalCount1).toBe(4)
    expect(hasNextPage1).toBeTruthy()

    const [records2, totalCount2, hasNextPage2] =
      await userWorkService.findWritings(user.id, {
        take: 2,
        after: { type: NODE_TYPES.Journal, id: records1[1].id },
      })
    expect(records2[0].id).toBe(journal2.id)
    expect(records2[0].type).toBe(NODE_TYPES.Journal)
    expect(records2[1].id).toBe(journal1.id)
    expect(records2[1].type).toBe(NODE_TYPES.Journal)
    expect(totalCount2).toBe(4)
    expect(hasNextPage2).toBeFalsy()
  })
})
