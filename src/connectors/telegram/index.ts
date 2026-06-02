import type { Connections } from '#definitions/index.js'

import { environment, isTest } from '#common/environment.js'
import { getLogger } from '#common/logger.js'
import * as Sentry from '@sentry/node'
import axios from 'axios'

const logger = getLogger('telegram')

/**
 * Dedup window for "one message per subject, increment count thereafter".
 * Reports for the same subject within this window edit the original message
 * instead of posting a new one, so the admin chat doesn't get flooded.
 */
const DEDUP_WINDOW_S = 60 * 60 * 24 // 24h

const TELEGRAM_API_TIMEOUT_MS = 5000

/**
 * Source label shown in the alert. Kept lightweight — the OSS UI is where
 * staff actually act on these.
 */
const SOURCE_LABELS: Record<NotifyReportInput['source'], string> = {
  direct: '🚨 站內檢舉',
  community_watch: '🛡️ 守望相助',
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
}

export type NotifyReportInput = {
  source: 'direct' | 'community_watch'
  /** Aggregation key. Same key → same Telegram message, count++ */
  dedupeKey: string
  /** Human-readable description of what was reported. */
  subject: string
  /** Raw reason enum value; will be mapped via REASON_LABELS. */
  reason: string
  /** Optional OSS deeplink the admin can click. */
  ossUrl?: string
}

type DedupRecord = {
  messageId: number
  count: number
}

/**
 * One-way Telegram alerter for new reports.
 *
 * Design constraints (intentional):
 *   - No webhooks, no bot commands, no inbound endpoints. The bot exists
 *     to post + edit messages, full stop. All actions (freeze, archive,
 *     etc.) happen in the OSS backend behind admin auth.
 *   - One message per subject within DEDUP_WINDOW_S; subsequent reports
 *     edit the original message and bump a counter.
 *   - Never throws to the caller. Telegram is a notification side-channel
 *     and must not fail the user-facing mutation.
 */
export class TelegramService {
  private botToken: string
  private chatId: string
  private threadId: string
  private redis: Connections['redis']

  public constructor(connections: Connections) {
    this.botToken = environment.telegramBotToken
    this.chatId = environment.telegramAlertChatId
    this.threadId = environment.telegramAlertThreadId
    this.redis = connections.redis
  }

  /**
   * Bot is "enabled" once both token and chat are configured. Skip in
   * test env so we don't hammer the API from CI.
   */
  private get enabled(): boolean {
    return !!(this.botToken && this.chatId) && !isTest
  }

  public notifyReport = async (input: NotifyReportInput): Promise<void> => {
    if (!this.enabled) {
      return
    }
    try {
      await this.handleNotifyReport(input)
    } catch (err) {
      // Fire-and-forget; never throw to caller. We log + report to Sentry
      // so on-call still finds out about silent breakage.
      logger.error(err, 'failed to send telegram report alert')
      Sentry.captureException(err)
    }
  }

  private async handleNotifyReport(input: NotifyReportInput): Promise<void> {
    const key = this.redisKey(input.dedupeKey)
    const cached = await this.redis.get(key)

    if (cached) {
      try {
        const record = JSON.parse(cached) as DedupRecord
        const nextCount = record.count + 1
        await this.editMessage(
          record.messageId,
          this.formatText({ ...input, count: nextCount })
        )
        await this.redis.set(
          key,
          JSON.stringify({ messageId: record.messageId, count: nextCount }),
          'EX',
          DEDUP_WINDOW_S
        )
        return
      } catch (err) {
        // Most common cause: the original message was deleted from the
        // chat, so editMessageText returns "message to edit not found".
        // Fall through to posting a new message; log so we notice patterns.
        logger.warn(err, 'telegram edit failed, sending new message')
      }
    }

    const messageId = await this.sendMessage(
      this.formatText({ ...input, count: 1 })
    )
    await this.redis.set(
      key,
      JSON.stringify({ messageId, count: 1 }),
      'EX',
      DEDUP_WINDOW_S
    )
  }

  private redisKey(dedupeKey: string): string {
    return `telegram:report:${dedupeKey}`
  }

  /**
   * Render the alert as Telegram HTML. We use HTML over MarkdownV2
   * because escaping is simpler: only `&`, `<`, `>` are reserved.
   */
  private formatText(
    input: NotifyReportInput & { count: number }
  ): string {
    const source = SOURCE_LABELS[input.source] ?? input.source
    const reason = REASON_LABELS[input.reason] ?? input.reason
    const lines = [
      `<b>${this.escape(source)}</b>`,
      `對象：${this.escape(input.subject)}`,
      `原因：${this.escape(reason)}`,
      `累積次數：${input.count}`,
    ]
    if (input.ossUrl) {
      lines.push(`<a href="${this.escapeAttr(input.ossUrl)}">進 OSS 處理</a>`)
    }
    return lines.join('\n')
  }

  /** Escape user-supplied text for Telegram HTML parse mode. */
  private escape(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
  }

  /** Escape a URL for use inside an HTML attribute. */
  private escapeAttr(url: string): string {
    return this.escape(url).replace(/"/g, '&quot;')
  }

  private async sendMessage(text: string): Promise<number> {
    const resp = await axios.post(
      `https://api.telegram.org/bot${this.botToken}/sendMessage`,
      {
        chat_id: this.chatId,
        ...(this.threadId
          ? { message_thread_id: Number(this.threadId) }
          : {}),
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      },
      { timeout: TELEGRAM_API_TIMEOUT_MS }
    )
    return resp.data.result.message_id as number
  }

  private async editMessage(
    messageId: number,
    text: string
  ): Promise<void> {
    await axios.post(
      `https://api.telegram.org/bot${this.botToken}/editMessageText`,
      {
        chat_id: this.chatId,
        message_id: messageId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      },
      { timeout: TELEGRAM_API_TIMEOUT_MS }
    )
  }
}
