import { compact } from 'lodash/compact'
import { merge } from 'lodash/merge'
import { trim } from 'lodash/trim'
import { set } from 'lodash/set'
import { replace } from 'lodash/replace'

/**
 * Clean up raw data and split scope string.
 */
const parse = (data: string) =>
  compact(replace(trim(data), '.', '').split(':'))

/**
 * Prepare scope data to be composed into a scope object.
 */
const prepare = (data: string) => {
  const list = parse(data)
  if (list.length <= 1) {
    return undefined
  }
  const value = list.pop()
  return [list.join('.'), value]
}

/**
 * Merge scopes as one.
 */
const process = (result: {[key: string]: any}, datum: any) => {
  if (!datum) {
    return result
  }
  return merge(result, set({}, datum[0], datum[1]))
}

/**
 * Make one scope object by parsing and merging mutiple scope strings.
 */
export const makeScope = (data: string[]) => {
  const source = data.map((datum: string) => prepare)
  return source.reduce((result, datum) => process, {})
}
