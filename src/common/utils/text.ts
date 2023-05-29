import { distance } from 'fastest-levenshtein'
import { OpenCC } from 'opencc'

import { MAX_TAG_CONTENT_LENGTH } from 'common/enums'

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

const t2sConverter: OpenCC = new OpenCC('t2s.json')

export const normalizeQueryInput = async (content: string): Promise<string> =>
  t2sConverter.convertPromise(stripSpaces(content.toLowerCase()) as string)
