import { MAX_TAG_CONTENT_LENGTH } from '#common/enums/index.js'
import crypto from 'crypto'
import { distance } from 'fastest-levenshtein'
import { simplecc } from 'simplecc-wasm'

export const countWords = (html: string) => {
  // Chinese(\u4e00-\u9fcc); Korean(\uac00-\ud7af); Japanese(\u3040-\u309f\u30a0-\u30ff); Russian([\u0401\u0451\u0410-\u044f]+)
  const regex =
    /[\u4e00-\u9fcc]|[\uac00-\ud7af]|[\u3040-\u309f\u30a0-\u30ff]|[\u0401\u0451\u0410-\u044f]+|\w+/g
  const content = stripHtml(html).trim()
  const matches = content.match(regex)

  const matchesLen = matches ? matches.length : 0
  const splitLen = content.split(/\s+/g).length

  if (matchesLen >= splitLen) {
    return matchesLen
  } else if (content.length > 0) {
    // fallback
    return splitLen
  } else {
    return 0
  }
}

/**
 * Get distances of two context diffs.
 */
export const measureDiffs = (source: string, target: string) =>
  distance(source, target)

const nonAlphaNumUni = String.raw`[^\p{Letter}\p{Number}]+`
const anyNonAlphaNum = new RegExp(nonAlphaNumUni, 'gu')

// to simulate slugify at DB server side
// https://github.com/thematters/matters-metabase/blob/master/sql/stale-tags-create-table-view.sql#L2-L13
// might be able to use under more scenarios
export const tagSlugify = (content: string) =>
  `${content}`
    // .toLowerCase()
    .replace(anyNonAlphaNum, '-') // replace all non alpha-number to `-`, including spaces and punctuations
    .replace(/(^-+|-+$)/g, '') // strip leading or trailing `-` if there's any

export const stripAllPunct = (content: string) => {
  const words = `${content}`.split(anyNonAlphaNum).filter(Boolean)
  switch (words.length) {
    case 0:
      return ''
    case 1:
      return words[0]
    default: {
      const [first, ...rest] = words
      return `${first} ${rest.join('')}`
    }
  }
}

export const stripSpaces = (content: string | null) =>
  content?.replaceAll(/[\b\s]+/g, ' ').trim()

export const normalizeTagInput = (content: string) =>
  stripAllPunct(content).substring(0, MAX_TAG_CONTENT_LENGTH)

export const normalizeSearchKey = async (content: string): Promise<string> =>
  simplecc(stripSpaces(content.toLowerCase()) as string, 't2s')

export const genMD5 = (content: string) =>
  crypto.createHash('md5').update(content).digest('hex')

export const genRandomString = () =>
  Buffer.from(Math.random().toString()).toString('base64').substring(10, 15)

/**
 * Strip HTML tags from HTML string to get plain text.
 * @param html - html string
 * @param tagReplacement - string to replace tags
 * @param lineReplacement - string to replace tags
 *
 * @see {@url https://github.com/thematters/ipns-site-generator/blob/main/src/utils/index.ts}
 */
type StripHTMLOptions = {
  tagReplacement?: string
  lineReplacement?: string
  ensureMentionTrailingSpace?: boolean
}

export const stripHtml = (html: string, options?: StripHTMLOptions) => {
  options = {
    tagReplacement: '',
    lineReplacement: '\n',
    ensureMentionTrailingSpace: false,
    ...options,
  }

  const { tagReplacement, lineReplacement, ensureMentionTrailingSpace } =
    options

  html = String(html) || ''

  html = html.replace(/&nbsp;/g, ' ')

  // Replace block-level elements with newlines
  html = html.replace(/<(\/?p|\/?blockquote|br\/?)>/gi, lineReplacement!)

  // Handle @user mentions and appending a space
  if (ensureMentionTrailingSpace) {
    html = html.replace(
      /<a\s+[^>]*class="mention"[^>]*>(.*?)<\/a>(.{1})/gi,
      (_, p1, p2) => {
        return `${p1}${p2 === ' ' ? ' ' : ` ${p2}`}`
      }
    )
  }

  // Remove remaining HTML tags
  let plainText = html.replace(/<\/?[^>]+(>|$)/g, tagReplacement!)

  // Normalize multiple newlines and trim the result
  plainText = plainText.replace(/\n\s*\n/g, '\n').trim()

  return plainText
}

const REGEXP_PUNCTUATION_CHINESE =
  '\u3002\uff1f\uff01\uff0c\u3001\uff1b\uff1a\u201c\u201d\u2018\u2019\uff08\uff09\u300a\u300b\u3008\u3009\u3010\u3011\u300e\u300f\u300c\u300d\ufe43\ufe44\u3014\u3015\u2026\u2014\uff5e\ufe4f\uffe5'

export const REGEXP_PUNCTUATION = `${REGEXP_PUNCTUATION_CHINESE}\x00-\x2f\x3a-\x3f\x41\x5b-\x60\x7a-\x7f` // without "@"

export const REGEXP_LATIN = '0-9A-Za-z\u00C0-\u00FF'
export const REGEXP_CJK =
  '\u4E00-\u9FFF\u3400-\u4DBF\u20000-\u2A6DF\u2A700-\u2B73F\u2B740-\u2B81F\u2B820-\u2CEAF\u2CEB0-\u2EBEF\u30000-\u3134F\u31350-\u323AF'

const countUnits = (text: string): number => {
  // Count @mentions as 1 unit
  if (text.startsWith('@')) return 1

  // Count Latin word as 1 unit
  if (new RegExp(`^[${REGEXP_LATIN}]+$`).test(text)) return 1

  // Count each CJK character as 1 unit
  return Array.from(text).reduce((count, char) => {
    // If it's a CJK character or digit, count it as 1 unit
    if (new RegExp(`[${REGEXP_CJK}]`).test(char)) {
      return count + 1
    }
    // Otherwise (punctuation, whitespace, etc.), don't count
    return count
  }, 0)
}

export const makeSummary = (html: string, maxUnits: number = 140) => {
  // Clean the HTML content first
  const plainText = stripHtml(html, {
    lineReplacement: ' ',
    ensureMentionTrailingSpace: true,
  })
    .replace(/&[^;]+;/g, ' ') // remove html entities
    .replace(/\s+/g, ' ') // normalize whitespace
    .trim()

  // Split the content into matchable tokens
  const matches =
    plainText.match(
      new RegExp(`(@[^\\s]+|[${REGEXP_LATIN}]+|[^${REGEXP_LATIN} ]+)`, 'g')
    ) || []

  let summary = ''
  let units = 0
  let hasMore = false

  function trimSpacesAndPunctuations(str: string) {
    return str
      .trim()
      .replace(
        new RegExp(`^[${REGEXP_PUNCTUATION}]+|[${REGEXP_PUNCTUATION}]+$`, 'g'),
        ''
      )
  }

  // Process each token
  for (const token of matches) {
    // If it's whitespace or punctuation, include it but don't count as a unit
    if (
      /^\s+$/.test(token) ||
      new RegExp(`^[${REGEXP_PUNCTUATION}]+$`, 'u').test(token)
    ) {
      if (!hasMore) {
        summary += token
      }
      continue
    }

    const tokenUnits = countUnits(token)

    // If this token would exceed the max units, mark there's more content
    if (units + tokenUnits > maxUnits) {
      hasMore = true
      break
    }

    // Add the token and count its units
    summary += token
    units += tokenUnits
  }

  // Add ellipsis if there's more content that wasn't included
  if (hasMore) {
    summary = trimSpacesAndPunctuations(summary) + '…'
  }

  return summary
}
