import { distance } from 'fastest-levenshtein'

/**
 * Get distances of two context diffs.
 */
export const measureDiffs = (source: string, target: string) =>
  distance(source, target)

export const stripPunctPrefixSuffix = (content: string) =>
  `${content}`
    .trim() // strip white space in both ends
    .replace(/^[^-+.\p{Letter}\p{Number}]+/gu, '') // strip prefix punctuation (non alpha-number)
    .replace(/[^-+.\p{Letter}\p{Number}]+$/gu, '') // strip suffix punctuation (non alpha-number)
    .trim() // strip white space again

// to simulate slugify at DB server side
// https://github.com/thematters/matters-metabase/blob/master/sql/stale-tags-create-table-view.sql#L2-L13
// might be able to use under more scenarios
export const tagSlugify = (content: string) =>
  `${content}`
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-') // replace all non alpha-number to `-`, including spaces and punctuations
    .replace(/(^-+|-+$)/g, '') // strip leading or trailing `-` if there's any
