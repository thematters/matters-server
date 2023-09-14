import { Redis } from 'ioredis'
import { RedisMemoryServer } from 'redis-memory-server'

import { RatelimitCounter } from 'common/utils'

test('increment', async () => {
  const redisServer = new RedisMemoryServer()
  const redisPort = await redisServer.getPort()
  const redisHost = await redisServer.getHost()
  const redis = new Redis(redisPort, redisHost)

  const counter = new RatelimitCounter(redis)
  const key = 'test:increment'
  const value1 = await counter.increment(key)
  expect(value1).toBe(1)
  const value2 = await counter.increment(key)
  expect(value2).toBe(2)
  const value = await counter.get(key)
  expect(value).toBe(2)

  redis.disconnect()
  await redisServer.stop()
})
