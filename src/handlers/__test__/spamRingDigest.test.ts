import type { SpamRingDigestStats } from '../spamRingDigest.js'

import { jest } from '@jest/globals'

// Minimal knex query-builder stub: each `knexRO('spam_ring')` call gets
// the next queued result, matching the query order inside collectStats.
const queuedResults: unknown[] = []
const makeBuilder = (result: unknown) => {
  const qb: any = {
    where: () => qb,
    count: () => qb,
    orderBy: () => qb,
    limit: () => qb,
    first: async () => result,
    select: async () => result,
  }
  return qb
}
const knexRO = jest.fn((_table: unknown) => makeBuilder(queuedResults.shift()))
const redisStore = new Map<string, string>()
const redis = {
  get: jest.fn(async (key: unknown) => redisStore.get(key as string) ?? null),
  set: jest.fn(
    async (
      key: unknown,
      value: unknown,
      _ex?: unknown,
      _ttl?: unknown,
      nx?: unknown
    ) => {
      const normalizedKey = key as string
      if (nx === 'NX' && redisStore.has(normalizedKey)) {
        return null
      }
      redisStore.set(normalizedKey, value as string)
      return 'OK'
    }
  ),
  del: jest.fn(async (key: unknown) => {
    redisStore.delete(key as string)
    return 1
  }),
}

jest.unstable_mockModule('../../connections.js', () => ({
  connections: { knexRO, redis },
}))

// Mock axios BEFORE importing the SUT (ESM rule); the shared telegram
// helper posts via axios.post.
jest.unstable_mockModule('axios', () => ({
  default: { post: jest.fn() },
}))

const { environment } = await import('#common/environment.js')
const axios = (await import('axios')).default as unknown as {
  post: jest.Mock<(...args: unknown[]) => unknown>
}
const { formatDigest, handler } = await import('../spamRingDigest.js')

const makeStats = (
  overrides: Partial<SpamRingDigestStats> = {}
): SpamRingDigestStats => ({
  pendingTotal: 3,
  detectedLast24h: 2,
  frozenLast24h: 1,
  topPending: [
    {
      fingerprint: 'abcdef0123456789',
      nAuthors: 12,
      nArticles: 45,
      newAccountRatio: 0.92,
      severity: 'high',
    },
    {
      fingerprint: 'ffff0000aaaa',
      nAuthors: 4,
      nArticles: 9,
      newAccountRatio: null,
      severity: null,
    },
  ],
  ...overrides,
})

describe('formatDigest', () => {
  it('renders counts, top pending rings and the console link', () => {
    const text = formatDigest(makeStats())
    expect(text).toContain('Spam Ring 日報')
    expect(text).toContain('待處理 ring：3')
    expect(text).toContain('近 24 小時新偵測：2')
    expect(text).toContain('近 24 小時凍結：1')
    // fingerprint truncated to first 8 chars, wrapped in <code>
    expect(text).toContain('<code>abcdef01</code>')
    expect(text).not.toContain('abcdef0123456789')
    expect(text).toContain('成員 12')
    expect(text).toContain('文章 45')
    expect(text).toContain('新帳號比 92%')
    expect(text).toContain('等級 高')
    expect(text).toContain('href="https://oss.matters.town/next/rings"')
  })

  it('renders placeholders for missing ratio and severity', () => {
    const text = formatDigest(makeStats())
    expect(text).toContain('新帳號比 —')
    expect(text).toContain('等級 —')
  })

  it('sends an all-clear one-liner when nothing is pending or new', () => {
    const text = formatDigest(
      makeStats({
        pendingTotal: 0,
        detectedLast24h: 0,
        frozenLast24h: 0,
        topPending: [],
      })
    )
    expect(text).toContain('一切平安')
    expect(text).not.toContain('待處理 Top')
    // console link is always present
    expect(text).toContain('href="https://oss.matters.town/next/rings"')
  })

  it('escapes HTML in fingerprints', () => {
    const text = formatDigest(
      makeStats({
        topPending: [
          {
            fingerprint: '<script>',
            nAuthors: 1,
            nArticles: 1,
            newAccountRatio: null,
            severity: null,
          },
        ],
      })
    )
    expect(text).not.toContain('<script>')
    expect(text).toContain('&lt;script&gt;')
  })
})

describe('handler', () => {
  const originalEnv = environment.env
  const originalTelegramBotToken = environment.telegramBotToken
  const originalTelegramAlertChatId = environment.telegramAlertChatId
  const originalTelegramAlertThreadId = environment.telegramAlertThreadId

  beforeEach(() => {
    axios.post.mockReset()
    knexRO.mockClear()
    redis.get.mockClear()
    redis.set.mockClear()
    redis.del.mockClear()
    redisStore.clear()
    queuedResults.length = 0
    ;(environment as { env: string }).env = 'production'
    ;(environment as { telegramBotToken: string }).telegramBotToken = 'tkn'
    ;(environment as { telegramAlertChatId: string }).telegramAlertChatId =
      '-100'
    ;(environment as { telegramAlertThreadId: string }).telegramAlertThreadId =
      '42'
  })

  afterEach(() => {
    jest.useRealTimers()
    ;(environment as { env: string | undefined }).env = originalEnv
    ;(environment as { telegramBotToken: string }).telegramBotToken =
      originalTelegramBotToken
    ;(environment as { telegramAlertChatId: string }).telegramAlertChatId =
      originalTelegramAlertChatId
    ;(environment as { telegramAlertThreadId: string }).telegramAlertThreadId =
      originalTelegramAlertThreadId
  })

  it('skips silently when telegram config is missing', async () => {
    ;(environment as { telegramBotToken: string }).telegramBotToken = ''

    await handler()

    expect(knexRO).not.toHaveBeenCalled()
    expect(axios.post).not.toHaveBeenCalled()
  })

  it('skips in non-production environments', async () => {
    ;(environment as { env: string }).env = 'development'

    await handler()

    expect(knexRO).not.toHaveBeenCalled()
    expect(redis.get).not.toHaveBeenCalled()
    expect(axios.post).not.toHaveBeenCalled()
  })

  it('skips when the daily digest was already sent', async () => {
    redisStore.set('spam-ring-digest:sent:2026-07-07', '1')
    jest.useFakeTimers().setSystemTime(new Date('2026-07-07T01:00:00Z'))

    await handler()

    expect(knexRO).not.toHaveBeenCalled()
    expect(axios.post).not.toHaveBeenCalled()
  })

  it('skips when another digest send is in progress', async () => {
    redisStore.set('spam-ring-digest:lock:2026-07-07', '1')
    jest.useFakeTimers().setSystemTime(new Date('2026-07-07T01:00:00Z'))

    await handler()

    expect(knexRO).not.toHaveBeenCalled()
    expect(axios.post).not.toHaveBeenCalled()
  })

  it('collects stats and posts the digest with thread id', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-07T01:00:00Z'))
    // query order in collectStats: pending / detected / frozen / top rows
    queuedResults.push({ count: '3' }, { count: '2' }, { count: '1' }, [
      {
        fingerprint: 'abcdef0123456789',
        nAuthors: 12,
        nArticles: 45,
        newAccountRatio: '0.92',
        severity: 'high',
      },
    ])
    axios.post.mockResolvedValueOnce({
      data: { ok: true, result: { message_id: 7 } },
    } as never)

    await handler()

    expect(axios.post).toHaveBeenCalledTimes(1)
    const [url, body] = axios.post.mock.calls[0] as [
      string,
      Record<string, unknown>
    ]
    expect(url).toContain('/sendMessage')
    expect(body).toMatchObject({
      chat_id: '-100',
      message_thread_id: 42,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    })
    const text = (body as { text: string }).text
    expect(text).toContain('待處理 ring：3')
    expect(text).toContain('<code>abcdef01</code>')
    // pg numeric string is normalized before formatting
    expect(text).toContain('新帳號比 92%')
    expect(redisStore.get('spam-ring-digest:sent:2026-07-07')).toBe('1')
    expect(redisStore.has('spam-ring-digest:lock:2026-07-07')).toBe(false)
  })
})
