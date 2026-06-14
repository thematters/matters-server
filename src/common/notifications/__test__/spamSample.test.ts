import type { SpamSampleCaptured } from '../spamSample.js'

import { QUEUE_URL } from '#common/enums/index.js'
import { environment } from '#common/environment.js'
import { aws } from '#connectors/aws/index.js'

import { enqueueSpamSample } from '../spamSample.js'

describe('enqueueSpamSample (producer)', () => {
  const originalQueue = QUEUE_URL.spamSample
  const originalSalt = environment.spamSampleHashSalt
  // sqsSendMessage is a class-field arrow function, so we replace it
  // directly on the instance for the duration of each test.
  const originalSqsSend = aws.sqsSendMessage
  let sentMessages: Array<{
    messageBody: SpamSampleCaptured
    queueUrl: string
  }>

  beforeEach(() => {
    sentMessages = []
    ;(aws as { sqsSendMessage: typeof aws.sqsSendMessage }).sqsSendMessage =
      (async (params) => {
        sentMessages.push({
          messageBody: params.messageBody as SpamSampleCaptured,
          queueUrl: params.queueUrl as string,
        })
      }) as typeof aws.sqsSendMessage
    ;(QUEUE_URL as { spamSample: string }).spamSample = 'https://sqs.test/spam'
    ;(environment as { spamSampleHashSalt: string }).spamSampleHashSalt =
      'test-salt'
  })

  afterEach(() => {
    ;(aws as { sqsSendMessage: typeof aws.sqsSendMessage }).sqsSendMessage =
      originalSqsSend
    ;(QUEUE_URL as { spamSample: string }).spamSample = originalQueue as string
    ;(environment as { spamSampleHashSalt: string }).spamSampleHashSalt =
      originalSalt
  })

  it('produces a de-identified payload for confirmed spam', async () => {
    await enqueueSpamSample({
      label: 1,
      text: '外送茶 加賴 fjn88',
      labelSource: 'community_watch_remove:porn_ad',
      commentId: '101',
      authorId: '7',
      score: 0.93,
    })

    expect(sentMessages).toHaveLength(1)
    const sent = sentMessages[0]
    expect(sent.queueUrl).toBe('https://sqs.test/spam')
    expect(sent.messageBody).toMatchObject({
      label: 1,
      text: '外送茶 加賴 fjn88',
      labelSource: 'community_watch_remove:porn_ad',
      score: 0.93,
    })
    // ids must be hashed, never carried raw
    expect(sent.messageBody.commentHash).toMatch(/^[0-9a-f]{64}$/)
    expect(sent.messageBody.authorHash).toMatch(/^[0-9a-f]{64}$/)
    expect(sent.messageBody.commentHash).not.toBe('101')
    expect(sent.messageBody.authorHash).not.toBe('7')
    expect(sent.messageBody.occurredAt).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
    )
  })

  it('carries label 0 for hard-negative ham and null score', async () => {
    await enqueueSpamSample({
      label: 0,
      text: '正常留言',
      labelSource: 'community_watch_clear:porn_ad',
      commentId: '202',
      authorId: '8',
    })

    expect(sentMessages).toHaveLength(1)
    expect(sentMessages[0].messageBody).toMatchObject({ label: 0, score: null })
  })

  it('hashes ids deterministically (stable dedup key)', async () => {
    await enqueueSpamSample({
      label: 1,
      text: 'a',
      labelSource: 's',
      commentId: '101',
      authorId: '7',
    })
    await enqueueSpamSample({
      label: 1,
      text: 'b',
      labelSource: 's',
      commentId: '101',
      authorId: '7',
    })
    expect(sentMessages[0].messageBody.commentHash).toBe(
      sentMessages[1].messageBody.commentHash
    )
  })

  it('emits empty authorHash when authorId is null', async () => {
    await enqueueSpamSample({
      label: 1,
      text: 'x',
      labelSource: 's',
      commentId: '101',
      authorId: null,
    })
    expect(sentMessages[0].messageBody.authorHash).toBe('')
  })

  it('is a no-op when the queue URL is not configured', async () => {
    ;(QUEUE_URL as { spamSample: string }).spamSample = ''
    await enqueueSpamSample({
      label: 1,
      text: 'x',
      labelSource: 's',
      commentId: '1',
      authorId: '2',
    })
    expect(sentMessages).toHaveLength(0)
  })

  it('is a no-op when the hash salt is not configured', async () => {
    ;(environment as { spamSampleHashSalt: string }).spamSampleHashSalt = ''
    await enqueueSpamSample({
      label: 1,
      text: 'x',
      labelSource: 's',
      commentId: '1',
      authorId: '2',
    })
    expect(sentMessages).toHaveLength(0)
  })

  it('is a no-op when text is blank', async () => {
    await enqueueSpamSample({
      label: 1,
      text: '   ',
      labelSource: 's',
      commentId: '1',
      authorId: '2',
    })
    expect(sentMessages).toHaveLength(0)
  })

  it('swallows AWS errors so callers are never blocked', async () => {
    ;(aws as { sqsSendMessage: typeof aws.sqsSendMessage }).sqsSendMessage =
      (async () => {
        throw new Error('AWS unavailable')
      }) as typeof aws.sqsSendMessage

    await expect(
      enqueueSpamSample({
        label: 1,
        text: 'x',
        labelSource: 's',
        commentId: '1',
        authorId: '2',
      })
    ).resolves.toBeUndefined()
  })
})
