import type { ReportAlertRequested } from '#common/notifications/reportAlert.js'
import type { SQSEvent, SQSBatchResponse } from 'aws-lambda'

import { environment } from '#common/environment.js'
import { getLogger } from '#common/logger.js'
import {
  sendTelegramMessage,
  TELEGRAM_API_TIMEOUT_MS,
} from '#common/notifications/telegram.js'
import * as Sentry from '@sentry/node'
import axios from 'axios'

import { connections } from '../connections.js'

const logger = getLogger('handler-report-telegram-alert')

/**
 * Dedup window for "one message per subject, increment count thereafter".
 * Reports for the same subject within this window edit the original message
 * instead of posting a new one, so the admin chat doesn't get flooded.
 */
const DEDUP_WINDOW_S = 60 * 60 * 24 // 24h

const SOURCE_LABELS: Record<ReportAlertRequested['source'], string> = {
  direct: '🚨 站內檢舉',
  community_watch: '🛡️ 守望相助',
  spam_detection: '🤖 留言垃圾偵測',
}

/**
 * Reason → Chinese label. Covers both ReportReason (in-site) and
 * CommunityWatchActionReason (porn_ad / spam_ad). Unknown values fall
 * back to the raw enum string so we never silently drop information.
 */
const REASON_LABELS: Record<string, string> = {
  tort: '侵權',
  illegal_advertising: '違法廣告',
  discrimination_insult_hatred: '歧視/侮辱/仇恨',
  pornography_involving_minors: '涉及未成年的色情內容',
  other: '其他',
  porn_ad: '色情/成人廣告',
  spam_ad: '濫發廣告',
  // comment-spam detection tiers (source: spam_detection)
  spam_auto: '高信度垃圾(色情/招攬/博弈)— 建議處置',
  spam_ring: '重複貼文 ring — 建議處置',
  spam_review: '高分待人工確認',
}

type DedupRecord = {
  messageId: number
  count: number
}

const redisKey = (dedupeKey: string): string => `telegram:report:${dedupeKey}`

/** Escape user-supplied text for Telegram HTML parse mode. */
const escapeHtml = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** Escape a URL for use inside an HTML attribute. */
const escapeHtmlAttr = (url: string): string =>
  escapeHtml(url).replace(/"/g, '&quot;')

/**
 * Render the alert as Telegram HTML. We use HTML over MarkdownV2 because
 * escaping is simpler: only `&`, `<`, `>` are reserved.
 */
export const formatText = (
  payload: ReportAlertRequested & { count: number }
): string => {
  const source = SOURCE_LABELS[payload.source] ?? payload.source
  const reason = REASON_LABELS[payload.reason] ?? payload.reason
  const lines = [
    `<b>${escapeHtml(source)}</b>`,
    `對象：${escapeHtml(payload.subject)}`,
    `原因：${escapeHtml(reason)}`,
    `累積次數：${payload.count}`,
  ]
  if (payload.ossUrl) {
    lines.push(`<a href="${escapeHtmlAttr(payload.ossUrl)}">進 OSS 處理</a>`)
  }
  return lines.join('\n')
}

const isValidPayload = (raw: unknown): raw is ReportAlertRequested => {
  if (!raw || typeof raw !== 'object') return false
  const v = raw as Record<string, unknown>
  return (
    (v.source === 'direct' ||
      v.source === 'community_watch' ||
      v.source === 'spam_detection') &&
    typeof v.dedupeKey === 'string' &&
    v.dedupeKey.length > 0 &&
    typeof v.subject === 'string' &&
    typeof v.reason === 'string' &&
    (v.ossUrl === undefined || typeof v.ossUrl === 'string') &&
    typeof v.occurredAt === 'string'
  )
}

const editMessage = async (
  botToken: string,
  chatId: string,
  messageId: number,
  text: string
): Promise<void> => {
  await axios.post(
    `https://api.telegram.org/bot${botToken}/editMessageText`,
    {
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    },
    { timeout: TELEGRAM_API_TIMEOUT_MS }
  )
}

/**
 * Process a single SQS record. Side-effects:
 *   - On first sighting of `dedupeKey`: sendMessage, cache messageId+count
 *   - On repeat within DEDUP_WINDOW_S: editMessageText with bumped count
 *
 * Throws on any failure that should be retried by SQS (the partial
 * batch-failure mode in handler() converts thrown records into retry
 * entries while preserving successful records).
 */
export const processRecord = async (
  payload: ReportAlertRequested,
  botToken: string,
  chatId: string,
  threadId: string,
  redis: typeof connections.redis
): Promise<void> => {
  const key = redisKey(payload.dedupeKey)
  const cached = await redis.get(key)

  if (cached) {
    try {
      const record = JSON.parse(cached) as DedupRecord
      const nextCount = record.count + 1
      await editMessage(
        botToken,
        chatId,
        record.messageId,
        formatText({ ...payload, count: nextCount })
      )
      await redis.set(
        key,
        JSON.stringify({ messageId: record.messageId, count: nextCount }),
        'EX',
        DEDUP_WINDOW_S
      )
      return
    } catch (err) {
      // Most common cause: the cached message was deleted in the chat,
      // so editMessageText returns "message to edit not found". Fall
      // through to posting a fresh message; log so we notice patterns.
      logger.warn(err, 'telegram edit failed, sending new message')
    }
  }

  const messageId = await sendTelegramMessage({
    botToken,
    chatId,
    threadId,
    text: formatText({ ...payload, count: 1 }),
  })
  await redis.set(
    key,
    JSON.stringify({ messageId, count: 1 }),
    'EX',
    DEDUP_WINDOW_S
  )
}

/**
 * SQS-triggered Lambda handler. Reads `ReportAlertRequested` events and
 * delivers them to the admin Telegram chat, with 24h per-subject dedup.
 *
 * Uses SQS partial batch failure reporting: one bad record does not hide
 * unrelated failed records or force successful records to be retried.
 * See {@link https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html#services-sqs-batchfailurereporting}.
 */
export const handler = async (event: SQSEvent): Promise<SQSBatchResponse> => {
  const botToken = environment.telegramBotToken
  const chatId = environment.telegramAlertChatId
  const threadId = environment.telegramAlertThreadId

  // Treat missing bot/chat config as retryable. Returning success here would
  // delete SQS records during early bring-up or a bad secret rollout.
  if (!botToken || !chatId) {
    logger.warn(
      'report-telegram-alert: missing telegram config; retrying %d records',
      event.Records.length
    )
    return {
      batchItemFailures: event.Records.map(({ messageId }) => ({
        itemIdentifier: messageId,
      })),
    }
  }

  const redis = connections.redis

  const results = await Promise.allSettled(
    event.Records.map(async ({ body }: { body: string }) => {
      let parsed: unknown
      try {
        parsed = JSON.parse(body)
      } catch (err) {
        // Malformed JSON is unrecoverable; surface to Sentry but don't
        // retry forever — return success so the message leaves the queue.
        logger.error(err, 'report-alert record is not valid JSON')
        Sentry.captureException(err, { extra: { body } })
        return
      }

      if (!isValidPayload(parsed)) {
        // Unrecoverable schema mismatch; same treatment as malformed JSON.
        logger.error('report-alert payload failed validation %j', parsed)
        Sentry.captureMessage('report-alert payload failed validation', {
          extra: { body },
        })
        return
      }

      await processRecord(parsed, botToken, chatId, threadId, redis)
    })
  )

  const batchItemFailures: Array<{ itemIdentifier: string }> = []
  results.forEach((res, index) => {
    if (res.status === 'rejected') {
      logger.error(res.reason, 'report-alert record failed; will retry')
      Sentry.captureException(res.reason)
      batchItemFailures.push({ itemIdentifier: event.Records[index].messageId })
    }
  })

  return { batchItemFailures }
}
