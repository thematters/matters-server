import type { Connections } from '#definitions/index.js'

import { SearchService } from '#connectors/index.js'

import { genConnections, closeConnections } from '../utils.js'

let connections: Connections
let searchService: SearchService

beforeAll(async () => {
  connections = await genConnections()
  searchService = new SearchService(connections)
}, 30000)

afterAll(async () => {
  await closeConnections(connections)
})

describe('search', () => {
  test('empty result', async () => {
    const res = await searchService.searchTags({
      key: 'not-existed-tag',
      skip: 0,
      take: 10,
    })
    expect(res.totalCount).toBe(0)
  })
  test('prefer exact match', async () => {
    const res = await searchService.searchTags({
      key: 'tag',
      skip: 0,
      take: 10,
    })
    expect(res.totalCount).toBe(4)
    expect(res.nodes[0].content).toBe('tag')
  })
  test('prefer more articles', async () => {
    const res = await searchService.searchTags({
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
    const res1 = await searchService.searchTags({
      key: '#tag',
      skip: 0,
      take: 10,
    })
    expect(res1.totalCount).toBe(4)
    expect(res1.nodes[0].content).toBe('tag')
    const res2 = await searchService.searchTags({
      key: '＃tag',
      skip: 0,
      take: 10,
    })
    expect(res2.totalCount).toBe(4)
    expect(res2.nodes[0].content).toBe('tag')
  })
  test('handle empty string', async () => {
    const res1 = await searchService.searchTags({ key: '', skip: 0, take: 10 })
    expect(res1.totalCount).toBe(0)
    const res2 = await searchService.searchTags({ key: '#', skip: 0, take: 10 })
    expect(res2.totalCount).toBe(0)
  })
  test('right totalCount with take and skip', async () => {
    const res1 = await searchService.searchTags({
      key: 'tag',
      skip: 0,
      take: 10,
      quicksearch: true,
    })
    expect(res1.nodes.length).toBe(4)
    expect(res1.totalCount).toBe(4)
    const res2 = await searchService.searchTags({
      key: 'tag',
      skip: 0,
      take: 1,
      quicksearch: true,
    })
    expect(res2.nodes.length).toBe(1)
    expect(res2.totalCount).toBe(4)
    const res3 = await searchService.searchTags({
      key: 'tag',
      skip: 1,
      take: 10,
      quicksearch: true,
    })
    expect(res3.nodes.length).toBe(3)
    expect(res3.totalCount).toBe(4)
  })
})
