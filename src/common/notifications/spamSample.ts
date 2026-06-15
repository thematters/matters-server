import { QUEUE_URL } from '#common/enums/index.js'
import { environment } from '#common/environment.js'
import { getLogger } from '#common/logger.js'
import { aws } from '#connectors/aws/index.js'
import * as Sentry from '@sentry/node'
import { createHmac } from 'node:crypto'

const logger = getLogger('spam-sample')

/**
 * Shape of the SQS message emitted when a moderation event yields a labeled
 * sample worth keeping for the spam-model training corpus (axis-2 L2).
 *
 * The point of L2 is to capture content at the moment of moderation so it
 * survives later deletion: `clearCommunityWatchOriginalContent` nulls the
 * snapshot, and account archival/ban can purge content — both would erase the
 * training signal that L1's passive DB extraction relies on. A separate Lambda
 * worker consumes this queue and appends de-identified rows to the S3 training
 * bucket.
 *
 * De-identification happens HERE so no raw user/content ids ever enter the
 * queue: ids are replaced with HMAC-SHA256(salt, id) (stable for dedup, not
 * reversible). Only the text the model needs to learn from is carried verbatim.
 */
export type SpamSampleCaptured = {
  /** 1 = spam (confirmed/blocked), 0 = ham (false-positive / reversed). */
  label: 0 | 1
  /** The content to train on (the only field carried verbatim). */
  text: string
  /** Where this label came from, e.g. 'community_watch_remove:porn_ad'. */
  labelSource: string
  /** Model spam score at capture time, if known. */
  score?: number | null
  /** HMAC of the comment id (dedup key, non-reversible). */
  commentHash: string
  /** HMAC of the author id (non-reversible). */
  authorHash: string
  /** ISO-8601 capture time, stamped by the producer. */
  occurredAt: string
}

const hash = (value: string): string =>
  createHmac('sha256', environment.spamSampleHashSalt)
    .update(String(value))
    .digest('hex')

/**
 * Emit a `SpamSampleCaptured` event to SQS. Mirrors `enqueueReportAlert`:
 *   - Best-effort: NEVER throws — a queue/crypto issue must not fail the
 *     moderation mutation that triggered it.
 *   - No-op when the queue or salt is unconfigured (local/dev), so the salt is
 *     never optional-but-empty in a way that would weaken the hash silently.
 */
export const enqueueSpamSample = async (input: {
  label: 0 | 1
  text: string
  labelSource: string
  commentId: string
  authorId: string | null
  score?: number | null
}): Promise<void> => {
  if (!QUEUE_URL.spamSample || !environment.spamSampleHashSalt) {
    return
  }
  if (!input.text || !input.text.trim()) {
    return
  }

  try {
    const message: SpamSampleCaptured = {
      label: input.label,
      text: input.text,
      labelSource: input.labelSource,
      score: input.score ?? null,
      commentHash: hash(input.commentId),
      authorHash: input.authorId ? hash(input.authorId) : '',
      occurredAt: new Date().toISOString(),
    }
    await aws.sqsSendMessage({
      messageBody: message,
      queueUrl: QUEUE_URL.spamSample,
    })
  } catch (err) {
    logger.error(err, 'failed to enqueue spam sample')
    Sentry.captureException(err)
  }
}
