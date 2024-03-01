import type { Connections } from 'definitions'

import { TagService } from 'connectors'

import { genConnections, closeConnections } from './utils'

let connections: Connections
let tagService: TagService

beforeAll(async () => {
  connections = await genConnections()
  tagService = new TagService(connections)
}, 30000)

afterAll(async () => {
  await closeConnections(connections)
})

test('countArticles', async () => {
  const count = await tagService.countArticles({ id: '2' })
  expect(count).toBeDefined()
})

test('findArticleIds', async () => {
  const articleIds = await tagService.findArticleIds({ id: '2' })
  expect(articleIds).toBeDefined()
})

test('findArticleCovers', async () => {
  const covers = await tagService.findArticleCovers({ id: '2' })
  expect(covers).toBeDefined()
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
