import { connectionFromArraySlice } from 'graphql-relay'
import { Base64 } from 'js-base64'

import { DEFAULT_TAKE_PER_PAGE } from 'common/enums'

export type ConnectionCursor = string

// TODO: make this type more specific, something like:
// export type ConnectionArguments =
//   | { before: ConnectionCursor; first?: number; last?: number; after?: never }
//   | { after: ConnectionCursor; first?: number; last?: number; before?: never }
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

/**
 * Converts an array of data into a Connection object based on the provided arguments.
 *
 * { before } and { after } should always appear separately
 * @template T - The type of data in the array.
 * @param {T[]} data - The array of data to be converted.
 * @param {ConnectionArguments} args - The arguments for pagination and filtering.
 * @param {number} [totalCount] - The total count of items in the data array.
 * @returns {Connection<T>} - The Connection object containing the paginated data.
 */
export const connectionFromArray = <T>(
  data: T[],
  args: ConnectionArguments,
  totalCount?: number
): Connection<T> => {
  if (totalCount) {
    const { after, before, first } = args // after and before should not appear together
    const offset = before ? -cursorToIndex(before) : cursorToIndex(after) + 1

    const edges = data.map((value, index) => ({
      cursor: indexToCursor(index + offset),
      node: value,
    }))

    const firstEdge = edges[0]
    const lastEdge = edges[edges.length - 1]

    // Simplify the calculation of hasPreviousPage and hasNextPage
    let hasPreviousPage = false
    let hasNextPage = false

    if (after) {
      hasPreviousPage = cursorToIndex(after) >= 0
    } else if (before) {
      const beforeIndex = cursorToIndex(before)
      hasPreviousPage = beforeIndex >= (first ? first : 0)
    } else {
      hasPreviousPage = cursorToIndex(firstEdge.cursor) >= 0
    }

    if (lastEdge) {
      hasNextPage = cursorToIndex(lastEdge.cursor) + 1 < totalCount
    }

    return {
      edges,
      totalCount,
      pageInfo: {
        startCursor: firstEdge ? firstEdge.cursor : '',
        endCursor: lastEdge ? lastEdge.cursor : '',
        hasPreviousPage,
        hasNextPage,
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

type Options = {
  allowTakeAll: boolean
  defaultTake: number
  maxTake: number
  maxSkip: number
}

/**
 * Converts connection arguments into `take` and `skip` values for pagination.
 *
 * @param args - The connection arguments.
 * @param options - Optional configuration options.
 * @returns An object containing the `take` and `skip` values.
 */
export function fromConnectionArgs(
  args: ConnectionArguments,
  options: Partial<Options> = {}
) {
  const DEFAULT_OPTIONS = {
    allowTakeAll: false,
    defaultTake: DEFAULT_TAKE_PER_PAGE,
    maxTake: Infinity,
    maxSkip: Infinity,
  }
  const { allowTakeAll, defaultTake, maxTake, maxSkip }: Options = {
    ...DEFAULT_OPTIONS,
    ...options,
  }
  const { first, after, before } = args

  let take = first ?? defaultTake
  let skip = 0

  if (before) {
    const beforeCursor = cursorToIndex(before)
    if (take > beforeCursor - 1) {
      // If `take` is greater than `beforeCursor - 1`, return all records up to `before - 1`
      return { take: beforeCursor, skip: 0 } // Ignore `skip` value
    }
    take = Math.min(beforeCursor - 1, take)
    skip = Math.max(0, beforeCursor - take)
  } else if (after) {
    const afterCursor = cursorToIndex(after) + 1
    skip = afterCursor
    if (first === null && !allowTakeAll) {
      take = defaultTake
    }
  }

  take = Math.min(take, maxTake)
  skip = Math.min(skip, maxSkip)

  return { take, skip }
}
