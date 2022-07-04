import { distance } from 'fastest-levenshtein'

/**
 * Get distances of two context diffs.
 */
export const measureDiffs = (source: string, target: string) =>
  distance(source, target)

const nonAlphaNumUni = String.raw`[^\p{Letter}\p{Number}]+`
const prefixOrSuffixNonAlphaNum = new RegExp(
  `(^${nonAlphaNumUni}|${nonAlphaNumUni}$)`,
  'gu'
)

export const stripPunctPrefixSuffix = (content: string) =>
  `${content}`.replace(prefixOrSuffixNonAlphaNum, '') // strip prefix or suffix punct

const anyNonAlphaNum = new RegExp(nonAlphaNumUni, 'gu')

// to simulate slugify at DB server side
// https://github.com/thematters/matters-metabase/blob/master/sql/stale-tags-create-table-view.sql#L2-L13
// might be able to use under more scenarios
export const tagSlugify = (content: string) =>
  `${content}`
    // .toLowerCase()
    .replace(anyNonAlphaNum, '-') // replace all non alpha-number to `-`, including spaces and punctuations
    .replace(/(^-+|-+$)/g, '') // strip leading or trailing `-` if there's any
