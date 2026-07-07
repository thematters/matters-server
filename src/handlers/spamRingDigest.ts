import type { SpamRingSeverity } from '#definitions/index.js'

import { environment } from '#common/environment.js'
import { getLogger } from '#common/logger.js'
import { sendTelegramMessage } from '#common/notifications/telegram.js'

import { connections } from '../connections.js'

const logger = getLogger('handler-spam-ring-digest')

const OSS_RINGS_URL = 'https://oss.matters.town/next/rings'
const LOOKBACK_MS = 24 * 60 * 60 * 1000
const TOP_PENDING_LIMIT = 5
const FINGERPRINT_DISPLAY_LENGTH = 8
const DEDUPE_TTL_SECONDS = 30 * 60 * 60
const LOCK_TTL_SECONDS = 10 * 60

export type SpamRingDigestTopRing = {
  fingerprint: string
  nAuthors: number
  nArticles: number
  newAccountRatio: number | null
  severity: SpamRingSeverity | null
}

export type SpamRingDigestStats = {
  pendingTotal: number
  detectedLast24h: number
  frozenLast24h: number
  topPending: SpamRingDigestTopRing[]
}

const SEVERITY_LABELS: Record<SpamRingSeverity, string> = {
  low: '低',
  medium: '中',
  high: '高',
  critical: '嚴重',
}

/** Escape dynamic text for Telegram HTML parse mode. */
const escapeHtml = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const formatRatio = (ratio: number | null): string =>
  ratio === null ? '—' : `${Math.round(ratio * 100)}%`

const formatSeverity = (severity: SpamRingSeverity | null): string =>
  severity ? SEVERITY_LABELS[severity] ?? severity : '—'

/**
 * Render the daily spam-ring digest as Telegram HTML.
 * Pure function (stats in, string out) so layout is unit-testable
 * without a database or the Telegram API.
 */
export const formatDigest = (stats: SpamRingDigestStats): string => {
  const lines: string[] = ['<b>🕸️ Spam Ring 日報</b>']

  if (stats.pendingTotal === 0 && stats.detectedLast24h === 0) {
    // All-clear one-liner: still send so admins know the job ran.
    lines.push('過去 24 小時無新偵測，也沒有待處理的 ring，一切平安。')
  } else {
    lines.push(
      `待處理 ring：${stats.pendingTotal}`,
      `近 24 小時新偵測：${stats.detectedLast24h}`,
      `近 24 小時凍結：${stats.frozenLast24h}`
    )
    if (stats.topPending.length > 0) {
      lines.push('', `<b>待處理 Top ${TOP_PENDING_LIMIT}（依成員數）</b>`)
      stats.topPending.forEach((ring, index) => {
        const fingerprint = escapeHtml(
          ring.fingerprint.slice(0, FINGERPRINT_DISPLAY_LENGTH)
        )
        lines.push(
          `${index + 1}. <code>${fingerprint}</code>` +
            `｜成員 ${ring.nAuthors}` +
            `｜文章 ${ring.nArticles}` +
            `｜新帳號比 ${formatRatio(ring.newAccountRatio)}` +
            `｜等級 ${formatSeverity(ring.severity)}`
        )
      })
    }
  }

  lines.push('', `<a href="${OSS_RINGS_URL}">前往控制台處理</a>`)
  return lines.join('\n')
}

const toCount = (row: unknown): number =>
  Number((row as { count?: string | number } | undefined)?.count ?? 0)

const digestDateKey = (date = new Date()): string =>
  date.toISOString().slice(0, 10)

const sentKey = (date = new Date()): string =>
  `spam-ring-digest:sent:${digestDateKey(date)}`

const lockKey = (date = new Date()): string =>
  `spam-ring-digest:lock:${digestDateKey(date)}`

/** Read-only aggregation over the spam_ring table (replica connection). */
export const collectStats = async (): Promise<SpamRingDigestStats> => {
  const knexRO = connections.knexRO
  const since = new Date(Date.now() - LOOKBACK_MS)

  const [pendingRow, detectedRow, frozenRow, topRows] = await Promise.all([
    knexRO('spam_ring').where({ status: 'pending' }).count().first(),
    knexRO('spam_ring').where('detectedAt', '>=', since).count().first(),
    knexRO('spam_ring').where('frozenAt', '>=', since).count().first(),
    knexRO('spam_ring')
      .where({ status: 'pending' })
      .orderBy('nAuthors', 'desc')
      .limit(TOP_PENDING_LIMIT)
      .select(
        'fingerprint',
        'nAuthors',
        'nArticles',
        'newAccountRatio',
        'severity'
      ),
  ])

  return {
    pendingTotal: toCount(pendingRow),
    detectedLast24h: toCount(detectedRow),
    frozenLast24h: toCount(frozenRow),
    topPending: (topRows as SpamRingDigestTopRing[]).map((row) => ({
      fingerprint: row.fingerprint,
      nAuthors: Number(row.nAuthors),
      nArticles: Number(row.nArticles),
      // pg returns numeric columns as strings; normalize for formatting
      newAccountRatio:
        row.newAccountRatio === null ? null : Number(row.newAccountRatio),
      severity: row.severity,
    })),
  }
}

/**
 * Cron-invoked Lambda handler: post the daily spam-ring digest to the
 * admin Telegram chat. Read-only; scheduling (EventBridge) is wired on
 * the infra side and is NOT part of this repo.
 */
export const handler = async (): Promise<void> => {
  if (environment.env !== 'production') {
    logger.info('spam-ring-digest: non-production environment; skipped')
    return
  }

  const botToken = environment.telegramBotToken
  const chatId = environment.telegramAlertChatId
  const threadId = environment.telegramAlertThreadId

  // Cron trigger has no SQS retry semantics; missing config is a no-op.
  if (!botToken || !chatId) {
    logger.warn('spam-ring-digest: missing telegram config; skipped')
    return
  }

  const redis = connections.redis
  const now = new Date()
  const dedupeKey = sentKey(now)
  const inFlightKey = lockKey(now)

  if (await redis.get(dedupeKey)) {
    logger.info('spam-ring-digest: already sent for %s; skipped', dedupeKey)
    return
  }

  const lock = await redis.set(inFlightKey, '1', 'EX', LOCK_TTL_SECONDS, 'NX')
  if (lock !== 'OK') {
    logger.info('spam-ring-digest: send already in progress; skipped')
    return
  }

  try {
    const stats = await collectStats()
    await sendTelegramMessage({
      botToken,
      chatId,
      threadId,
      text: formatDigest(stats),
    })
    await redis.set(dedupeKey, '1', 'EX', DEDUPE_TTL_SECONDS)
    logger.info('spam-ring-digest sent: %j', {
      pendingTotal: stats.pendingTotal,
      detectedLast24h: stats.detectedLast24h,
      frozenLast24h: stats.frozenLast24h,
    })
  } catch (error) {
    await redis.del(inFlightKey)
    throw error
  }

  await redis.del(inFlightKey)
}
