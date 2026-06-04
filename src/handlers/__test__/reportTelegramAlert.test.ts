import type { ReportAlertRequested } from '#common/notifications/reportAlert.js'
import type { SQSEvent, SQSRecord } from 'aws-lambda'

import { jest } from '@jest/globals'

const handlerRedis = {
  get: jest.fn(async () => null),
  set: jest.fn(async () => 'OK'),
}

jest.unstable_mockModule('../../connections.js', () => ({
  connections: {
    redis: handlerRedis,
  },
}))

// Mock axios BEFORE importing the SUT (ESM rule). The handler imports
// `axios from 'axios'` and uses axios.post, so the mock shape must
// expose `default.post` as a jest mock.
jest.unstable_mockModule('axios', () => ({
  default: { post: jest.fn() },
}))

const { environment } = await import('#common/environment.js')
const axios = (await import('axios')).default as unknown as {
  // Loose typing so mockResolvedValue / mockRejectedValue accept any value
  // — the strict generic on jest.Mock would otherwise infer `never`.
  post: jest.Mock<(...args: unknown[]) => unknown>
}
const { formatText, processRecord, handler } = await import(
  '../reportTelegramAlert.js'
)

const makePayload = (
  overrides: Partial<ReportAlertRequested> = {}
): ReportAlertRequested => ({
  source: 'direct',
  dedupeKey: 'direct:Article:1',
  subject: 'Article (X)',
  reason: 'other',
  ossUrl: 'https://oss.example.com/reports?targetId=X',
  occurredAt: '2026-06-03T00:00:00.000Z',
  ...overrides,
})

// Minimal in-memory Redis stub. Only the methods processRecord actually
// calls are implemented; anything else throws so we notice if the
// production code starts depending on something new.
const makeRedis = () => {
  const store = new Map<string, string>()
  const redis = {
    get: jest.fn(async (key: unknown) => store.get(key as string) ?? null),
    set: jest.fn(async (key: unknown, value: unknown) => {
      store.set(key as string, value as string)
      return 'OK'
    }),
    _store: store,
  }
  return redis as unknown as Parameters<typeof processRecord>[4] & {
    get: jest.Mock
    set: jest.Mock
    _store: Map<string, string>
  }
}

describe('formatText', () => {
  it('renders the four canonical lines for a direct report', () => {
    const text = formatText({ ...makePayload(), count: 1 })
    expect(text).toContain('🚨 站內檢舉')
    expect(text).toContain('對象：Article (X)')
    expect(text).toContain('原因：其他')
    expect(text).toContain('累積次數：1')
    expect(text).toContain('href="https://oss.example.com/reports?targetId=X"')
  })

  it('labels community-watch source distinctly', () => {
    const text = formatText({
      ...makePayload({ source: 'community_watch', reason: 'porn_ad' }),
      count: 3,
    })
    expect(text).toContain('🛡️ 守望相助')
    expect(text).toContain('原因：色情/成人廣告')
    expect(text).toContain('累積次數：3')
  })

  it('escapes HTML in user-supplied subject/reason values', () => {
    const text = formatText({
      ...makePayload({
        subject: 'Article <script>',
        reason: 'unknown_value_with_<>',
      }),
      count: 1,
    })
    // <script> must not appear as literal HTML
    expect(text).not.toMatch(/<script>/)
    expect(text).toContain('&lt;script&gt;')
    expect(text).toContain('&lt;&gt;')
  })

  it('omits the OSS link when ossUrl is missing', () => {
    const text = formatText({
      ...makePayload({ ossUrl: undefined }),
      count: 1,
    })
    expect(text).not.toContain('進 OSS 處理')
  })
})

describe('processRecord', () => {
  beforeEach(() => {
    axios.post.mockReset()
  })

  it('sends a new Telegram message the first time a dedupeKey is seen', async () => {
    axios.post.mockResolvedValueOnce({
      data: { ok: true, result: { message_id: 7 } },
    } as never)
    const redis = makeRedis()

    await processRecord(makePayload(), 'tkn', '-100', '', redis)

    expect(axios.post).toHaveBeenCalledTimes(1)
    const [url, body] = axios.post.mock.calls[0] as [string, Record<string, unknown>]
    expect(url).toContain('/sendMessage')
    expect(body).toMatchObject({
      chat_id: '-100',
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    })
    expect((body as { text: string }).text).toContain('累積次數：1')
    expect(redis._store.get('telegram:report:direct:Article:1')).toBe(
      JSON.stringify({ messageId: 7, count: 1 })
    )
  })

  it('edits the existing Telegram message on duplicate dedupeKey', async () => {
    axios.post.mockResolvedValueOnce(undefined as never)
    const redis = makeRedis()
    redis._store.set(
      'telegram:report:direct:Article:1',
      JSON.stringify({ messageId: 7, count: 1 })
    )

    await processRecord(makePayload(), 'tkn', '-100', '', redis)

    expect(axios.post).toHaveBeenCalledTimes(1)
    const [url, body] = axios.post.mock.calls[0] as [string, Record<string, unknown>]
    expect(url).toContain('/editMessageText')
    expect(body).toMatchObject({ message_id: 7 })
    expect((body as { text: string }).text).toContain('累積次數：2')
    expect(redis._store.get('telegram:report:direct:Article:1')).toBe(
      JSON.stringify({ messageId: 7, count: 2 })
    )
  })

  it('falls back to a fresh sendMessage when edit fails (deleted message)', async () => {
    // 1st call: editMessageText rejects (e.g. message_to_edit_not_found)
    axios.post.mockRejectedValueOnce(
      new Error('message to edit not found') as never
    )
    // 2nd call: sendMessage succeeds
    axios.post.mockResolvedValueOnce({
      data: { ok: true, result: { message_id: 99 } },
    } as never)

    const redis = makeRedis()
    redis._store.set(
      'telegram:report:direct:Article:1',
      JSON.stringify({ messageId: 7, count: 4 })
    )

    await processRecord(makePayload(), 'tkn', '-100', '', redis)

    expect(axios.post).toHaveBeenCalledTimes(2)
    expect(axios.post.mock.calls[0][0]).toContain('/editMessageText')
    expect(axios.post.mock.calls[1][0]).toContain('/sendMessage')
    // After fallback the cache is reset to count=1 against the NEW message_id
    expect(redis._store.get('telegram:report:direct:Article:1')).toBe(
      JSON.stringify({ messageId: 99, count: 1 })
    )
  })

  it('passes message_thread_id when configured', async () => {
    axios.post.mockResolvedValueOnce({
      data: { ok: true, result: { message_id: 1 } },
    } as never)

    await processRecord(makePayload(), 'tkn', '-100', '42', makeRedis())

    const [, body] = axios.post.mock.calls[0] as [string, Record<string, unknown>]
    expect(body).toMatchObject({ message_thread_id: 42 })
  })
})

describe('handler', () => {
  const originalTelegramBotToken = environment.telegramBotToken
  const originalTelegramAlertChatId = environment.telegramAlertChatId
  const originalTelegramAlertThreadId = environment.telegramAlertThreadId

  const makeRecord = (body: string, messageId: string): SQSRecord =>
    ({
      messageId,
      receiptHandle: 'r',
      body,
      attributes: {} as SQSRecord['attributes'],
      messageAttributes: {},
      md5OfBody: '',
      eventSource: 'aws:sqs',
      eventSourceARN: '',
      awsRegion: '',
    } as SQSRecord)

  beforeEach(() => {
    axios.post.mockReset()
    handlerRedis.get.mockReset()
    handlerRedis.set.mockReset()
    handlerRedis.get.mockResolvedValue(null)
    handlerRedis.set.mockResolvedValue('OK')
    ;(environment as { telegramBotToken: string }).telegramBotToken = 'tkn'
    ;(environment as { telegramAlertChatId: string }).telegramAlertChatId =
      '-100'
    ;(environment as { telegramAlertThreadId: string }).telegramAlertThreadId =
      ''
  })

  afterEach(() => {
    ;(environment as { telegramBotToken: string }).telegramBotToken =
      originalTelegramBotToken
    ;(environment as { telegramAlertChatId: string }).telegramAlertChatId =
      originalTelegramAlertChatId
    ;(environment as { telegramAlertThreadId: string }).telegramAlertThreadId =
      originalTelegramAlertThreadId
  })

  it('returns all records as failures when telegram config is missing', async () => {
    ;(environment as { telegramBotToken: string }).telegramBotToken = ''
    const event: SQSEvent = {
      Records: [
        makeRecord(JSON.stringify(makePayload()), 'm1'),
        makeRecord(
          JSON.stringify(makePayload({ dedupeKey: 'direct:Article:2' })),
          'm2'
        ),
      ],
    }
    const res = await handler(event)
    expect(res).toEqual({
      batchItemFailures: [
        { itemIdentifier: 'm1' },
        { itemIdentifier: 'm2' },
      ],
    })
    expect(axios.post).not.toHaveBeenCalled()
  })

  it('drops malformed records without retrying forever', async () => {
    axios.post.mockResolvedValueOnce({
      data: { ok: true, result: { message_id: 11 } },
    } as never)
    const event: SQSEvent = {
      Records: [
        makeRecord('not-json', 'bad-json'),
        makeRecord(JSON.stringify({ source: 'direct' }), 'bad-schema'),
        makeRecord(JSON.stringify(makePayload()), 'good'),
      ],
    }

    const res = await handler(event)

    expect(res).toEqual({ batchItemFailures: [] })
    expect(axios.post).toHaveBeenCalledTimes(1)
  })

  it('returns partial batch failures when telegram delivery fails', async () => {
    axios.post
      .mockResolvedValueOnce({
        data: { ok: true, result: { message_id: 11 } },
      } as never)
      .mockRejectedValueOnce(new Error('telegram unavailable') as never)

    const event: SQSEvent = {
      Records: [
        makeRecord(JSON.stringify(makePayload()), 'ok'),
        makeRecord(
          JSON.stringify(makePayload({ dedupeKey: 'direct:Article:2' })),
          'retry'
        ),
      ],
    }

    const res = await handler(event)

    expect(res).toEqual({
      batchItemFailures: [{ itemIdentifier: 'retry' }],
    })
    expect(axios.post).toHaveBeenCalledTimes(2)
  })
})
