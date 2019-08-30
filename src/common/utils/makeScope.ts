import _ from 'lodash'

/**
 * Clean up raw data and split scope string.
 */
const parse = (data: string) =>
  _.compact(_.replace(_.trim(data), '.', '').split(':'))

/**
 * Prepare scope data to be composed into a scope object.
 */
const prepare = (data: string, root?: string) => {
  const list = parse(data)
  if (list.length <= 1) {
    return undefined
  }
  if (root) {
    list[0] = root
  }
  const value = list.pop()
  return [list.join('.'), value]
}

/**
 * Merge scopes as one.
 */
const process = (result: { [key: string]: any }, datum: any) => {
  if (!datum) {
    return result
  }
  return _.merge(result, _.set({}, datum[0], datum[1]))
}

/**
 * Make one scope object by parsing and merging mutiple scope strings.
 */
export const makeScope = (data: string[], root?: string) => {
  const source = data.map((datum: string) => prepare(datum, root))
  return source.reduce((result, datum) => process(result, datum), {})
}

/**
 * Check if a given object is a valid scope.
 */
export const isValidScope = (scope: {[key: string]: any}) =>
  _.isObject(scope) && _.has(scope, 'mode') && _.has(scope, 'scope')
