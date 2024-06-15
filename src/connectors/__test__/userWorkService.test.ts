import type { Connections } from 'definitions'

import { genConnections, closeConnections } from './utils'
import { UserWorkService } from 'connectors'

let connections: Connections
let userWorkService: UserWorkService

beforeAll(async () => {
  connections = await genConnections()
  userWorkService = new UserWorkService(connections)
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
