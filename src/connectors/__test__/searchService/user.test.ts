import type { Connections } from '#definitions/index.js'

import { USER_ACTION } from '#common/enums/index.js'
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
    const res = await searchService.searchUsers({
      key: 'not-exist',
      take: 1,
      skip: 0,
    })
    expect(res.totalCount).toBe(0)
  })
  test('prefer exact match', async () => {
    const res = await searchService.searchUsers({
      key: 'test1',
      take: 3,
      skip: 0,
    })
    expect(res.totalCount).toBe(2)
    expect(res.nodes[0].userName).toBe('test1')
  })
  test('prefer more num_followers', async () => {
    const getNumFollowers = async (id: string) =>
      (
        await connections
          .knex('search_index.user')
          .where({ id })
          .select('num_followers')
      )[0].numFollowers || 0
    const res = await searchService.searchUsers({
      key: 'test',
      take: 3,
      skip: 0,
    })
    expect(await getNumFollowers(res.nodes[0].id)).toBeGreaterThanOrEqual(
      await getNumFollowers(res.nodes[1].id)
    )
    expect(await getNumFollowers(res.nodes[1].id)).toBeGreaterThanOrEqual(
      await getNumFollowers(res.nodes[2].id)
    )
  })
  test('handle prefix @,＠', async () => {
    const res = await searchService.searchUsers({
      key: '@test1',
      take: 3,
      skip: 0,
    })
    expect(res.totalCount).toBe(2)
    expect(res.nodes[0].userName).toBe('test1')
    const res2 = await searchService.searchUsers({
      key: '＠test1',
      take: 3,
      skip: 0,
    })
    expect(res2.totalCount).toBe(2)
    expect(res2.nodes[0].userName).toBe('test1')
  })
  test('handle empty string', async () => {
    const res1 = await searchService.searchUsers({ key: '', take: 3, skip: 0 })
    expect(res1.totalCount).toBe(0)
    const res2 = await searchService.searchUsers({ key: '@', take: 3, skip: 0 })
    expect(res2.totalCount).toBe(0)
  })
  test('handle blocked', async () => {
    await connections
      .knex('action_user')
      .insert({ userId: '2', action: USER_ACTION.block, targetId: '1' })

    const res = await searchService.searchUsers({
      key: 'test2',
      take: 3,
      skip: 0,
    })
    expect(res.totalCount).toBe(1)

    const res2 = await searchService.searchUsers({
      key: 'test2',
      take: 3,
      skip: 0,
      exclude: 'blocked',
      viewerId: '1',
    })
    expect(res2.totalCount).toBe(0)
  })
  test('right totalCount with take and skip', async () => {
    const res1 = await searchService.searchUsers({
      key: 'test',
      take: 10,
      skip: 0,
    })
    expect(res1.nodes.length).toBe(6)
    expect(res1.totalCount).toBe(6)
    const res2 = await searchService.searchUsers({
      key: 'test',
      take: 1,
      skip: 0,
    })
    expect(res2.nodes.length).toBe(1)
    expect(res2.totalCount).toBe(6)
    const res3 = await searchService.searchUsers({
      key: 'test',
      take: 10,
      skip: 1,
    })
    expect(res3.nodes.length).toBe(5)
    expect(res3.totalCount).toBe(6)
  })
})
