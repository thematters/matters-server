import { QUEUE_URL } from '#common/enums/index.js'
import { getLogger } from '#common/logger.js'
import { aws } from '#connectors/aws/index.js'
import * as Sentry from '@sentry/node'

const logger = getLogger('report-alert')

/**
 * Shape of the SQS message that the API runtime emits whenever a report
 * worth surfacing to the admin Telegram chat is created.
 *
 * Kept stable and tiny on purpose: the worker is a separate Lambda that
 * may roll out at a different cadence than the API, so the contract here
 * is the integration boundary between the two.
 */
export type ReportAlertRequested = {
  source: 'direct' | 'community_watch'
  /** Aggregation key — same key within 24h edits the same Telegram message. */
  dedupeKey: string
  /** Human-readable description of what was reported. */
  subject: string
  /** Raw reason enum value; the worker maps it to a localized label. */
  reason: string
  /** Optional OSS deeplink the admin can click. */
  ossUrl?: string
  /**
   * ISO-8601 timestamp of when the producer observed the event.
   * The worker may use this for ordering / staleness checks. Producer
   * stamps it so the worker doesn't have to trust its own clock.
   */
  occurredAt: string
}

/**
 * Emit a `ReportAlertRequested` event to SQS.
 *
 * Design constraints (intentional):
 *   - Best-effort: NEVER throws to the caller. A queue outage must not
 *     fail a user-facing report mutation. We log + report to Sentry so
 *     on-call still finds out about silent breakage.
 *   - Pure I/O: no business decisions live here. The worker decides
 *     whether to send/edit, how to format, how to dedupe.
 *   - Skipped when the queue is unconfigured (local/dev without the
 *     report-alert queue provisioned), matching how other producers in
 *     this codebase behave.
 */
export const enqueueReportAlert = async (
  payload: Omit<ReportAlertRequested, 'occurredAt'> & { occurredAt?: string }
): Promise<void> => {
  // No-op when the queue isn't configured. This lets contributors run
  // matters-server locally without standing up an SQS queue.
  if (!QUEUE_URL.reportAlert) {
    return
  }

  const message: ReportAlertRequested = {
    ...payload,
    occurredAt: payload.occurredAt ?? new Date().toISOString(),
  }

  try {
    await aws.sqsSendMessage({
      messageBody: message,
      queueUrl: QUEUE_URL.reportAlert,
    })
  } catch (err) {
    logger.error(err, 'failed to enqueue report alert')
    Sentry.captureException(err)
  }
}
