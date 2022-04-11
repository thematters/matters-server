import { distance } from 'fastest-levenshtein'

/**
 * Get distances of two context diffs.
 */
export const measureDiffs = (source: string, target: string) =>
  distance(source, target)

export const stripPunctPrefixSuffix = (content: string) =>
  `${content}`
    .trim() // strip white space in both ends
    .replace(/^\p{Punctuation}+/gu, '') // strip prefix punctuation
    .replace(/\p{Punctuation}+$/gu, '') // strip suffix punctuation
    .trim() // strip white space again
