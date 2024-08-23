import { connectionFromArraySlice } from 'graphql-relay'
import { Base64 } from 'js-base64'
import { Knex } from 'knex'

import { DEFAULT_TAKE_PER_PAGE, MAX_TAKE_PER_PAGE } from 'common/enums'
import { UserInputError } from 'common/errors'
import { selectWithTotalCount, selectWithRowNumber } from 'common/utils'

export type ConnectionCursor = string

export interface ConnectionArguments {
  before?: ConnectionCursor
  after?: ConnectionCursor
  first?: number | null
  last?: number | null
  includeBefore?: boolean
  includeAfter?: boolean
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
 * Construct a GQL connection using query keys mechanism. Query keys are
 * composed of `offset` and `idCursor`.
 * `offset` is for managing connection like `merge`,
 * and `idCursor` is for SQL querying.
 * (for detail explain see https://github.com/thematters/matters-server/pull/922#discussion_r409256544)
 *
 * @deprecated use `connectionFromQuery` instead
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

  // Convert query keys to GQL cursor. For example, the query keys
  // `arrayconnection:10:39` will be converted to `YXJyYXljb25uZWN0aW9uOjEwOjM5`.
  const keysToCursor = (offset: number, idCursor: string): ConnectionCursor =>
    Base64.encodeURI(`${PREFIX}:${offset}:${idCursor}`)

  const edges = data.map((value, index) => ({
    // TOFIX: offset calculation should consider `includeBefore` and `includeAfter`
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

/**
 * Construct a GQL connection from knex query using cursor based pagination.
 */
export const connectionFromQuery = async <T extends { id: string }>({
  query,
  args,
  orderBy,
  idCursorColumn,
}: {
  query: Knex.QueryBuilder<T>
  orderBy: { column: keyof T; order: 'asc' | 'desc' }

  idCursorColumn: keyof T
  args: ConnectionArguments
}): Promise<Connection<T>> => {
  const decodeCursor = (cursor: ConnectionCursor) =>
    Base64.decode(cursor).split(':')[1]
  const encodeCursor = (value: string): ConnectionCursor =>
    Base64.encodeURI(`${PREFIX}:${value}`)
  const { after, before, includeBefore, includeAfter } = args
  const first =
    args.first === null
      ? MAX_TAKE_PER_PAGE
      : args.first ?? DEFAULT_TAKE_PER_PAGE
  const last =
    args.last === null ? MAX_TAKE_PER_PAGE : args.last ?? DEFAULT_TAKE_PER_PAGE

  if (includeBefore && includeAfter) {
    throw new UserInputError('Cannot include both before and after.')
  }

  const knex = query.client.queryBuilder()
  const baseTableName = 'connection_base_table'
  knex.with(
    baseTableName,
    query
      .orderBy([orderBy])
      .modify(selectWithTotalCount)
      .modify(selectWithRowNumber)
  )
  const getOrderCursor = (idCursor: string) =>
    orderBy.column === idCursorColumn
      ? idCursor
      : knex.client.raw(
          `SELECT ${
            orderBy.column as string
          } FROM ${baseTableName} WHERE id = ${idCursor}`
        )

  // fetch before edges
  let beforeWhereOperator = orderBy.order === 'asc' ? '<' : '>'
  if (includeBefore) {
    beforeWhereOperator += '='
  }
  const beforeNodes: Array<T & { totalCount: number; rowNumber: number }> =
    before
      ? await knex
          .clone()
          .from(baseTableName)
          .where(
            orderBy.column as string,
            beforeWhereOperator,
            getOrderCursor(decodeCursor(before))
          )
          .limit(last)
      : []

  const beforeEdges = beforeNodes.map((node) => ({
    cursor: encodeCursor(node[idCursorColumn] as string),
    node,
  }))

  // fetch after edges
  let afterWhereOperator = orderBy.order === 'asc' ? '>' : '<'
  if (includeAfter) {
    afterWhereOperator += '='
  }
  const afterNodes: Array<T & { totalCount: number; rowNumber: number }> = after
    ? await knex
        .clone()
        .from(baseTableName)
        .where(
          orderBy.column as string,
          afterWhereOperator,
          getOrderCursor(decodeCursor(after))
        )
        .limit(first)
    : await knex.clone().from(baseTableName).limit(first)

  const afterEdges = afterNodes.map((node) => ({
    cursor: encodeCursor(node[idCursorColumn] as string),
    node,
  }))

  const edges = beforeEdges.concat(afterEdges)

  const firstEdge = edges[0]
  const lastEdge = edges[edges.length - 1]

  const totalCount = firstEdge
    ? firstEdge.node.totalCount
    : await knex
        .clone()
        .from(baseTableName)
        .count('*')
        .first()
        .then((result) => result?.count || 0)

  return {
    edges,
    totalCount,
    pageInfo: {
      startCursor: firstEdge ? firstEdge.cursor : null,
      endCursor: lastEdge ? lastEdge.cursor : null,
      hasPreviousPage: firstEdge && firstEdge.node.rowNumber > 1 ? true : false,
      hasNextPage:
        lastEdge && lastEdge.node.rowNumber < totalCount ? true : false,
    },
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
