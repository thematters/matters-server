import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const Redis = require('ioredis-mock')

import { Cache } from '#connectors/index.js'

const flush = () => new Promise((resolve) => setTimeout(resolve, 50))

test('miss returns null immediately without waiting for the getter', async () => {
  const cache = new Cache('test-warm-miss', new Redis())

  let resolved = false
  const result = await cache.getObjectOrWarm({
    keys: { type: 'miss' },
    getter: () =>
      new Promise((res) => {
        // slow getter; the request must not block on it
        const timer = setTimeout(() => {
          resolved = true
          res([{ id: '1' }])
        }, 5000)
        timer.unref()
      }),
  })

  expect(result).toBeNull()
  expect(resolved).toBe(false)
})

test('concurrent misses run the getter only once (single-flight)', async () => {
  const cache = new Cache('test-warm-single', new Redis())

  let count = 0
  const getter = async () => {
    count += 1
    return [{ id: '1' }]
  }

  const results = await Promise.all(
    Array.from({ length: 20 }).map(() =>
      cache.getObjectOrWarm({ keys: { type: 'single' }, getter })
    )
  )

  expect(results.every((r) => r === null)).toBe(true)

  await flush()
  expect(count).toBe(1)
})

test('getter success writes value, next read hits', async () => {
  const cache = new Cache('test-warm-hit', new Redis())
  const data = [{ id: 'a' }]

  const first = await cache.getObjectOrWarm({
    keys: { type: 'hit' },
    getter: async () => data,
  })
  expect(first).toBeNull()

  await flush()

  const second = await cache.getObjectOrWarm({
    keys: { type: 'hit' },
    getter: async () => {
      throw new Error('should not be called on hit')
    },
  })
  expect(second).toEqual(data)
})

test('getter error releases the lock and never rejects', async () => {
  const redis = new Redis()
  const cache = new Cache('test-warm-error', redis)

  let attempts = 0
  const throwingGetter = async () => {
    attempts += 1
    throw new Error('boom')
  }

  await cache.getObjectOrWarm({ keys: { type: 'err' }, getter: throwingGetter })
  await flush()
  expect(attempts).toBe(1)

  // lock was released, so a later miss can warm again
  const lockKey = `${cache.genKey({ type: 'err' })}:warm-lock`
  expect(await redis.get(lockKey)).toBeNull()

  await cache.getObjectOrWarm({ keys: { type: 'err' }, getter: throwingGetter })
  await flush()
  expect(attempts).toBe(2)
})
