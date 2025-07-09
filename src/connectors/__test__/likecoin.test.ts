import type { Connections } from '#definitions/index.js'

import { CACHE_PREFIX } from '#common/enums/index.js'
import { LikeCoin } from '../likecoin/index.js'
import { Cache } from '../cache/index.js'

import { genConnections, closeConnections } from './utils.js'

let connections: Connections

beforeAll(async () => {
  connections = await genConnections()
}, 30000)

afterAll(async () => {
  await closeConnections(connections)
})

const getCivicLikerStatus = async (likerId: string) => {
  const cache = new Cache(
    CACHE_PREFIX.CIVIC_LIKER,
    connections.objectCacheRedis
  )
  return await cache.getObject({
    keys: { id: likerId },
    getter: async () => null,
  })
}

describe('LikeCoin', () => {
  test('updateCivicLikerCaches', async () => {
    const likecoin = new LikeCoin(connections)
    const expire = 1
    await likecoin.updateCivicLikerCaches([])
    expect(await getCivicLikerStatus('test_liker_id_1')).toBeNull()

    await likecoin.updateCivicLikerCaches([
      {
        likerId: 'not-matters-user-liker-id',
        expire,
      },
    ])
    expect(await getCivicLikerStatus('not-matters-user-liker-id')).toBeNull()

    await likecoin.updateCivicLikerCaches([
      {
        likerId: 'test_liker_id_1',
        expire,
      },
    ])
    expect(await getCivicLikerStatus('test_liker_id_1')).toBe(true)

    await likecoin.updateCivicLikerCaches([])
    expect(await getCivicLikerStatus('test_liker_id_1')).toBe(true)
  })
})
