/**
 * Comment-spam classification signals.
 *
 * The comment-spam model gives a single score, but a high score alone is not
 * enough to act: on real data (matters_prod, 7-day window) the >= 0.94 band is
 * only ~60% precision — escort ads (0.996) score the same as 中文 creative
 * writing (0.992) and short genuine replies. Score cannot separate them.
 *
 * What DOES separate "true spam/abuse/porn" from false positives is a compound
 * gate. On the real high-score set this partition had ZERO false positives:
 *
 *   Tier A (auto):   score >= threshold AND has-contact AND has-solicitation
 *                    → escort / paid-services / account-selling / betting promo.
 *   Tier B (ring):   score >= threshold AND the author repeats near-identical
 *                    content across comments → templated link-builder spam.
 *   Tier C (review): score >= threshold but neither A nor B → surface to humans,
 *                    NEVER auto-act (this is where creative writing / opinions /
 *                    short replies land; a human confirms they are not spam).
 *
 * This module is pure (no I/O) so the gate is unit-testable in isolation; the
 * ring check (Tier B) needs the author's recent comments and is performed by
 * CommentService, which calls `nearDuplicate` from here.
 */

/** char-3gram Jaccard threshold for counting two comments as near-duplicates. */
export const RING_SIM_THRESHOLD = 0.8
/** how many near-identical sibling comments make a confirmed ring. */
export const RING_MIN_FAMILY = 3

/**
 * Contact / solicitation channel signals: phone numbers, messaging handles,
 * external links and domains. Deliberately broad — on its own it over-matches
 * (a bare @mention to another user trips `@handle`), which is why Tier A
 * requires BOTH this and a solicitation keyword. The conjunction is what makes
 * it precise.
 */
export const CONTACT_RE =
  /(telegram|what'?s\s?app|wechat|微信|line\s*(id|帳號)|賴|skype|t\.me\/|wa\.me\/|@[a-z0-9_]{4,}|\+?\d[\d\s().-]{7,}\d|https?:\/\/|www\.|\.(com|net|org|cn|pk|xyz|top|vip|me|info|biz|club|shop)\b)/i

/**
 * Solicitation keywords across the categories we want to catch: porn / escort,
 * betting / gambling, account-selling and paid-service spam. Matching one of
 * these is necessary-but-not-sufficient for Tier A (it also fires on a user
 * *discussing* betting / crypto — hence the AND with CONTACT_RE).
 */
export const SOLICIT_RE =
  /(escort|call\s*girls?|外送茶|約妹|約炮|叫小姐|上門服務|全套服務|莞式|spa\s*服務|按摩\s*(服務|到府)|betting|odds|predictions?|賠率|下注|博彩|彩票|百家樂|paxum|verified\s+accounts?|buy\s+[a-z ]*accounts?|usdt|代開|代辦|刷單|兼職日結|日結)/i

export type CommentSpamTier = 'auto' | 'ring' | 'review'

/** Reason enum value sent to the telegram alert worker per tier. */
export const TIER_REASON: Record<CommentSpamTier, string> = {
  auto: 'spam_auto',
  ring: 'spam_ring',
  review: 'spam_review',
}

/** Strip HTML tags and collapse whitespace to plain text. */
export const stripHtml = (html: string): string =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

export const hasContact = (text: string): boolean => CONTACT_RE.test(text)
export const hasSolicit = (text: string): boolean => SOLICIT_RE.test(text)

/**
 * Decide the content-only tier for a scored comment.
 *   - returns `null` when there is no threshold or the score is below it
 *     (nothing to surface);
 *   - returns `'auto'` for the high-precision contact+solicitation conjunction;
 *   - returns `'review'` otherwise (human-in-the-loop).
 * Tier B (`'ring'`) is decided by the caller, which has the author's history.
 */
export const classifyContentTier = ({
  score,
  content,
  threshold,
}: {
  score: number
  content: string
  threshold: number | null
}): 'auto' | 'review' | null => {
  if (!threshold || score < threshold) {
    return null
  }
  const text = stripHtml(content)
  return hasContact(text) && hasSolicit(text) ? 'auto' : 'review'
}

/**
 * Canonicalize a comment for near-duplicate comparison: drop HTML, lowercase,
 * mask the volatile bits a spammer rotates (urls, @handles, digits) and strip
 * punctuation/spacing so only the stable template skeleton remains.
 */
export const normalizeForDup = (content: string): string =>
  stripHtml(content)
    .toLowerCase()
    .replace(/https?:\/\/\S+|www\.\S+/g, ' ')
    .replace(/@[a-z0-9_]+/g, ' ')
    // drop whole alphanumeric tokens that contain a digit — these are the
    // contact IDs / phone numbers a spammer rotates between otherwise-identical
    // posts (sk3826, vip888, 0912-345...). Pure-letter words are kept so English
    // templates still ring-match.
    .replace(/[a-z0-9]*\d[a-z0-9]*/gi, ' ')
    .replace(/[^\p{Letter}\p{Number}]+/gu, '')

/** Set of character n-grams (default trigrams) of a normalized string. */
export const shingles = (s: string, n = 3): Set<string> => {
  const out = new Set<string>()
  if (s.length < n) {
    if (s) out.add(s)
    return out
  }
  for (let i = 0; i + n <= s.length; i++) {
    out.add(s.slice(i, i + n))
  }
  return out
}

export const jaccard = (a: Set<string>, b: Set<string>): number => {
  if (a.size === 0 && b.size === 0) return 0
  let inter = 0
  for (const x of a) if (b.has(x)) inter++
  const union = a.size + b.size - inter
  return union === 0 ? 0 : inter / union
}

/**
 * True when two raw comment contents are near-duplicates after canonicalization
 * (char-3gram Jaccard >= `threshold`). Robust to rotated urls/@/digits and small
 * edits without merging genuinely different texts.
 */
export const nearDuplicate = (
  a: string,
  b: string,
  threshold = RING_SIM_THRESHOLD
): boolean => {
  const na = normalizeForDup(a)
  const nb = normalizeForDup(b)
  // too-short normalized text is unreliable for ring matching
  if (na.length < 8 || nb.length < 8) return na === nb && na.length > 0
  return jaccard(shingles(na), shingles(nb)) >= threshold
}
