import { connectionFromArraySlice } from 'graphql-relay'
import * as Base64 from 'js-base64'

import { DEFAULT_TAKE_PER_PAGE } from 'common/enums/index.js'
import { Item } from 'definitions'

export type ConnectionCursor = string

export interface ConnectionArguments {
  before?: ConnectionCursor
  after?: ConnectionCursor
  first?: number
  last?: number
}

export interface ConnectionHelpers {
  offset: number
  totalCount: number
}

export interface Connection<T> {
  totalCount?: number
  edges: Array<Edge<T>>
  pageInfo: PageInfo
}

export interface Edge<T> {
  node: T
  cursor: ConnectionCursor
}

export interface PageInfo {
  startCursor?: ConnectionCursor | null
  endCursor?: ConnectionCursor | null
  hasPreviousPage?: boolean | null
  hasNextPage?: boolean | null
}

const PREFIX = 'arrayconnection'

export const cursorToOffset = (
  cursor: ConnectionCursor | undefined
): number => {
  return cursor ? parseInt(Base64.decode(cursor).split(':')[1], 10) : -1
}

export const cursorToIndex = (cursor: ConnectionCursor | undefined): number => {
  return cursor ? parseInt(Base64.decode(cursor).split(':')[1], 10) : -1
}

export const indexToCursor = (index: number | string): ConnectionCursor => {
  return Base64.encodeURI(`${PREFIX}:${index}`)
}

export function connectionFromArray<T>(
  data: T[],
  args: ConnectionArguments,
  totalCount?: number
): Connection<T> {
  if (totalCount) {
    const { after } = args
    const offset = cursorToIndex(after) + 1

    const edges = data.map((value, index) => ({
      cursor: indexToCursor(index + offset),
      node: value,
    }))

    const firstEdge = edges[0]
    const lastEdge = edges[edges.length - 1]

    return {
      edges,
      totalCount,
      pageInfo: {
        startCursor: firstEdge ? firstEdge.cursor : '',
        endCursor: lastEdge ? lastEdge.cursor : '',
        hasPreviousPage: after ? cursorToIndex(after) >= 0 : false,
        hasNextPage: lastEdge
          ? cursorToIndex(lastEdge.cursor) + 1 < totalCount
          : false,
      },
    }
  }

  const connections = connectionFromArraySlice(data, args, {
    sliceStart: 0,
    arrayLength: data.length,
  })

  return {
    ...connections,
    totalCount: data.length,
  }
}

export function connectionFromPromisedArray<T>(
  dataPromise: Promise<T[]> | T[],
  args: ConnectionArguments,
  totalCount?: number
): Promise<Connection<T>> {
  return Promise.resolve(dataPromise).then((data) =>
    connectionFromArray(data, args, totalCount)
  )
}

export const loadManyFilterError = (items: Array<Item | Error>) => {
  return items.filter((item: Item | Error) => {
    if (item instanceof Error) {
      return false
    }

    return true
  }) as Item[]
}

/**
 * Convert GQL curosr to query keys. For example, the GQL cursor
 * `YXJyYXljb25uZWN0aW9uOjEwOjM5` will be parsed as `arrayconnection:10:39`.
 *
 */
export const cursorToKeys = (
  cursor: ConnectionCursor | undefined
): { offset: number; idCursor?: number } => {
  if (!cursor) {
    return { offset: -1 }
  }
  const keys = Base64.decode(cursor).split(':')
  return { offset: parseInt(keys[1], 10), idCursor: parseInt(keys[2], 10) }
}

/**
 * Convert query keys to GQL curosr. For example, the query keys
 * `arrayconnection:10:39` will be converted to `YXJyYXljb25uZWN0aW9uOjEwOjM5`.
 *
 */
export const keysToCursor = (
  offset: number,
  idCursor: number
): ConnectionCursor => {
  return Base64.encodeURI(`${PREFIX}:${offset}:${idCursor}`)
}

/**
 * Construct a GQL connection using qeury keys mechanism. Query keys are
 * composed of `offset` and `idCursor`. `offset` is for managing connection
 * like `merge`, and `idCursor` is for SQL querying.
 *
 */
export function connectionFromArrayWithKeys(
  data: Array<Record<string, any>>,
  args: ConnectionArguments,
  totalCount?: number
): Connection<Record<string, any>> {
  if (totalCount) {
    const { after } = args
    const keys = cursorToKeys(after)

    const edges = data.map((value, index) => ({
      cursor: keysToCursor(index + keys.offset + 1, value.__cursor || value.id),
      node: value,
    }))

    const firstEdge = edges[0]
    const lastEdge = edges[edges.length - 1]

    return {
      edges,
      totalCount,
      pageInfo: {
        startCursor: firstEdge ? firstEdge.cursor : '',
        endCursor: lastEdge ? lastEdge.cursor : '',
        hasPreviousPage: after ? keys.offset >= 0 : false,
        hasNextPage: lastEdge
          ? cursorToKeys(lastEdge.cursor).offset + 1 < totalCount
          : false,
      },
    }
  }

  const connections = connectionFromArraySlice(data, args, {
    sliceStart: 0,
    arrayLength: data.length,
  })

  return {
    ...connections,
    totalCount: data.length,
  }
}

export const fromConnectionArgs = (
  input: { first?: number | null; after?: string },
  options?: {
    allowTakeAll?: boolean
    defaultTake?: number
    maxTake?: number
    maxSkip?: number
  }
) => {
  const { first, after } = input
  const {
    allowTakeAll = false,
    defaultTake = DEFAULT_TAKE_PER_PAGE,
    maxTake = Infinity,
    maxSkip = Infinity,
  } = options || {}

  let take = first as number
  if (first === null && !allowTakeAll) {
    take = defaultTake
  }
  if (first === undefined) {
    take = defaultTake
  }
  if (take > maxTake) {
    take = maxTake
  }

  const skip = Math.min(cursorToIndex(after) + 1, maxSkip)

  return { take, skip }
}
