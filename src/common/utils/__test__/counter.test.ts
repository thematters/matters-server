import Redis from 'ioredis-mock'

import { RatelimitCounter } from 'common/utils'

test('increment', async () => {
  const redis = new Redis()

  const counter = new RatelimitCounter(redis)
  const key = 'test:increment'
  const value1 = await counter.increment(key)
  expect(value1).toBe(1)
  const value2 = await counter.increment(key)
  expect(value2).toBe(2)
  const value = await counter.get(key)
  expect(value).toBe(2)
})
