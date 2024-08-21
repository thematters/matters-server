import { connectionFromArraySlice } from 'graphql-relay'
import { Base64 } from 'js-base64'

import { DEFAULT_TAKE_PER_PAGE } from 'common/enums'

export type ConnectionCursor = string

export interface ConnectionArguments {
  before?: ConnectionCursor
  after?: ConnectionCursor
  first?: number
  // last?: number
}

export interface Connection<T> {
  totalCount: number
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
  hasPreviousPage: boolean
  hasNextPage: boolean
}

const PREFIX = 'arrayconnection'

export const cursorToIndex = (cursor: ConnectionCursor | undefined): number =>
  cursor ? parseInt(Base64.decode(cursor).split(':')[1], 10) : -1

export const indexToCursor = (index: number | string): ConnectionCursor =>
  Base64.encodeURI(`${PREFIX}:${index}`)

export const connectionFromArray = <T>(
  data: T[],
  args: ConnectionArguments,
  totalCount?: number
): Connection<T> => {
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

export const connectionFromPromisedArray = <T>(
  dataPromise: Promise<Array<T | Error>> | Array<T | Error>,
  args: ConnectionArguments,
  totalCount?: number
): Promise<Connection<T>> =>
  Promise.resolve(dataPromise).then((data) =>
    connectionFromArray(loadManyFilterError(data), args, totalCount)
  )

export const loadManyFilterError = <T>(items: Array<T | Error>) =>
  items.filter((item) => {
    if (item instanceof Error) {
      return false
    }

    return true
  }) as T[]

/**
 * Convert GQL cursors to query keys. For example, the GQL cursor
 * `YXJyYXljb25uZWN0aW9uOjEwOjM5` will be parsed as `arrayconnection:10:39`.
 *
 */
export const cursorToKeys = (
  cursor: ConnectionCursor | undefined
): { offset: number; idCursor?: string } => {
  if (!cursor) {
    return { offset: -1 }
  }
  const keys = Base64.decode(cursor).split(':')
  return { offset: parseInt(keys[1], 10), idCursor: keys[2] }
}

/**
 * Convert query keys to GQL cursor. For example, the query keys
 * `arrayconnection:10:39` will be converted to `YXJyYXljb25uZWN0aW9uOjEwOjM5`.
 *
 */
const keysToCursor = (offset: number, idCursor: string): ConnectionCursor =>
  Base64.encodeURI(`${PREFIX}:${offset}:${idCursor}`)

/**
 * Construct a GQL connection using query keys mechanism. Query keys are
 * composed of `offset` and `idCursor`.
 * `offset` is for managing connection like `merge`,
 * and `idCursor` is for SQL querying.
 * (for detail explain see https://github.com/thematters/matters-server/pull/922#discussion_r409256544)
 */
export const connectionFromArrayWithKeys = <
  T extends { id: string; __cursor?: string }
>(
  data: T[],
  args: Pick<ConnectionArguments, 'after'>,
  totalCount: number
): Connection<T> => {
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

export const fromConnectionArgs = (
  input: { first?: number | null; after?: string; before?: string },
  options?: {
    allowTakeAll?: boolean
    defaultTake?: number
    maxTake?: number
    maxSkip?: number
  }
) => {
  const { first, after, before } = input

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

  const beforeCursor = cursorToIndex(before)
  if (before !== undefined) {
    // i.e. before is 3 and take is 10, ignore take
    if (beforeCursor < take) {
      take = 1
    }
    // if it is already the first one, skip everything
    else if (beforeCursor === 0) {
      take = -maxTake
    }
  }

  // if the `before` cursor is provided, go to the previous page
  const skip = before
    ? beforeCursor - take
    : Math.min(cursorToIndex(after) + 1, maxSkip)

  return { take, skip }
}
