// external
import _ from 'lodash'
import { responsePathAsArray } from 'graphql'
// local
import { SCOPE_TYPE } from '../enums'
import { isNotEmptyObject } from './validator'

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
 * Merge all scopes as one.
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
 * Get read scope by walking down to specific depth.
 */
const walkReadScopeByDepth = (scopes: any, nodes: any, depth: number) => {
  for (let level = 1; level <= depth; level ++) {
    const path = _.slice(nodes, 0, level)
    if (path.length === 0) {
      break
    }
    const permission = _.get(scopes, path.join('.'), false)
    if (permission === SCOPE_TYPE.read) {
      return true
    }
  }
  return false
}

/**
 * Check if this scope is valid.
 */
export const isValidReadScope = (scopes: any, paths: any) => {
  const nodes = responsePathAsArray(paths)
  const path = nodes.join('.') || ''
  const permission = _.get(scopes, path, false)

  // Check current field scope
  if (isNotEmptyObject(permission) || permission === SCOPE_TYPE.read) {
    return true
  }
  // Check parent's scope by depth
  if (walkReadScopeByDepth(scopes, nodes, 3)) {
    return true
  }
  return false
}
