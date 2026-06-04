import type { ReportAlertRequested } from '../reportAlert.js'

import { QUEUE_URL } from '#common/enums/index.js'
import { aws } from '#connectors/aws/index.js'

import { enqueueReportAlert } from '../reportAlert.js'

describe('enqueueReportAlert (producer)', () => {
  const originalReportAlert = QUEUE_URL.reportAlert
  // sqsSendMessage is a class-field arrow function, so we replace it
  // directly on the instance for the duration of each test.
  const originalSqsSend = aws.sqsSendMessage
  let sentMessages: Array<{
    messageBody: ReportAlertRequested
    queueUrl: string
  }>

  beforeEach(() => {
    sentMessages = []
    // Stub the AWS singleton so we can assert what would be enqueued
    // without actually hitting SQS in CI.
    ;(aws as { sqsSendMessage: typeof aws.sqsSendMessage }).sqsSendMessage =
      (async (params) => {
        sentMessages.push({
          messageBody: params.messageBody as ReportAlertRequested,
          queueUrl: params.queueUrl as string,
        })
      }) as typeof aws.sqsSendMessage
    ;(QUEUE_URL as { reportAlert: string }).reportAlert =
      'https://sqs.test/report-alert'
  })

  afterEach(() => {
    ;(aws as { sqsSendMessage: typeof aws.sqsSendMessage }).sqsSendMessage =
      originalSqsSend
    ;(QUEUE_URL as { reportAlert: string }).reportAlert =
      originalReportAlert as string
  })

  it('produces a well-formed payload for in-site reports', async () => {
    await enqueueReportAlert({
      source: 'direct',
      dedupeKey: 'direct:Article:42',
      subject: 'Article (QXJ0aWNsZTo0Mg)',
      reason: 'illegal_advertising',
      ossUrl: 'https://oss.example.com/reports?targetId=QXJ0aWNsZTo0Mg',
    })

    expect(sentMessages).toHaveLength(1)
    const sent = sentMessages[0]
    expect(sent.queueUrl).toBe('https://sqs.test/report-alert')
    expect(sent.messageBody).toMatchObject({
      source: 'direct',
      dedupeKey: 'direct:Article:42',
      subject: 'Article (QXJ0aWNsZTo0Mg)',
      reason: 'illegal_advertising',
      ossUrl: 'https://oss.example.com/reports?targetId=QXJ0aWNsZTo0Mg',
    })
    expect(typeof sent.messageBody.occurredAt).toBe('string')
    // Loose ISO-8601 sanity check; we don't try to validate calendar dates.
    expect(sent.messageBody.occurredAt).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
    )
  })

  it('produces a well-formed payload for community-watch removals', async () => {
    await enqueueReportAlert({
      source: 'community_watch',
      dedupeKey: 'cw:author:99',
      subject: 'Alice @alice',
      reason: 'porn_ad',
      ossUrl: 'https://oss.example.com/reports',
    })

    expect(sentMessages).toHaveLength(1)
    expect(sentMessages[0].messageBody).toMatchObject({
      source: 'community_watch',
      dedupeKey: 'cw:author:99',
      subject: 'Alice @alice',
      reason: 'porn_ad',
      ossUrl: 'https://oss.example.com/reports',
    })
  })

  it('is a no-op when the queue URL is not configured', async () => {
    ;(QUEUE_URL as { reportAlert: string }).reportAlert = ''

    await enqueueReportAlert({
      source: 'direct',
      dedupeKey: 'direct:Article:1',
      subject: 'Article (X)',
      reason: 'other',
    })

    expect(sentMessages).toHaveLength(0)
  })

  it('swallows AWS errors so callers are never blocked', async () => {
    ;(aws as { sqsSendMessage: typeof aws.sqsSendMessage }).sqsSendMessage =
      (async () => {
        throw new Error('AWS unavailable')
      }) as typeof aws.sqsSendMessage

    await expect(
      enqueueReportAlert({
        source: 'direct',
        dedupeKey: 'direct:Article:1',
        subject: 'Article (X)',
        reason: 'other',
      })
    ).resolves.toBeUndefined()
  })
})
