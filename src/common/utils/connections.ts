import type { Knex } from 'knex'

import {
  DEFAULT_TAKE_PER_PAGE,
  MAX_TAKE_PER_PAGE,
} from '#common/enums/index.js'
import { UserInputError } from '#common/errors.js'
import {
  selectWithTotalCount,
  selectWithRowNumber,
} from '#common/utils/index.js'
import { connectionFromArraySlice } from 'graphql-relay'
import { Base64 } from 'js-base64'

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
 * Construct a GQL connection from knex query.
 *
 * If `cursorColumn` is provided, use cursor based pagination.
 * Otherwise, use offset based pagination.
 *
 * Cursor based pagination is preferred because it's more efficient and more robust for varying sequence of data.
 * Offset based pagination is used as a fallback when cursor based pagination can not be applied for reasons like:
 *  1. nulls last ordering.
 *  2. numbered pages use cases, which need to calculate offset based on page number.
 */
export const connectionFromQuery = async <T extends { id: string }>({
  query,
  args,
  orderBy,
  cursorColumn,
  maxTake,
}: {
  query: Knex.QueryBuilder<T>
  orderBy: { column: keyof T; order: 'asc' | 'desc' }
  args: ConnectionArguments
  cursorColumn?: keyof T
  maxTake?: number
}): Promise<Connection<T>> => {
  if (cursorColumn) {
    return connectionFromQueryCursorBased({
      query,
      args,
      orderBy,
      cursorColumn,
      maxTake,
    })
  }

  return connectionFromQueryOffsetBased({ query, args, orderBy, maxTake })
}

/**
 * Construct a GQL connection from knex query using cursor based pagination.
 *
 * Note:
 *   This implementation does not support:
 *    1. nulls last ordering.
 *    2. numbered pages use cases, which need to calculate offset based on page number.
 *   In such cases, use offset based pagination instead.
 */
const connectionFromQueryCursorBased = async <T extends { id: string }>({
  query,
  args,
  orderBy,
  cursorColumn,
  maxTake,
}: {
  query: Knex.QueryBuilder<T>
  orderBy: { column: keyof T; order: 'asc' | 'desc' }

  cursorColumn: keyof T
  args: ConnectionArguments
  maxTake?: number
}): Promise<Connection<T>> => {
  const { after, before, includeBefore, includeAfter } = args

  if (after && before) {
    throw new UserInputError(
      'Cannot use both `after` and `before` at the same time.'
    )
  }

  const first =
    args.first === null
      ? MAX_TAKE_PER_PAGE
      : args.first ?? DEFAULT_TAKE_PER_PAGE
  const last =
    args.last === null ? MAX_TAKE_PER_PAGE : args.last ?? DEFAULT_TAKE_PER_PAGE

  const knex = query.client.queryBuilder()
  const baseTableName = 'connection_base'
  const sorted = query.orderBy([orderBy])
  knex.with(
    baseTableName,
    query.client
      .queryBuilder()
      .from(maxTake ? sorted.limit(maxTake).as('base') : sorted.as('base'))
      .select('*')
      .modify(selectWithTotalCount)
      .modify(selectWithRowNumber, orderBy)
  )
  const decodeCursor = (cursor: ConnectionCursor) =>
    Base64.decode(cursor).split(':')[1]
  const encodeCursor = (value: string): ConnectionCursor =>
    Base64.encodeURI(`${PREFIX}:${value}`)
  const getOrderCursor = (cursor: string) => {
    const value = decodeCursor(cursor)
    return orderBy.column === cursorColumn
      ? cursor
      : knex.client.raw('(SELECT ?? FROM ?? WHERE ?? = ?)', [
          orderBy.column,
          baseTableName,
          cursorColumn,
          value,
        ])
  }

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
          .orderBy(
            orderBy.column as string,
            orderBy.order === 'asc' ? 'desc' : 'asc' // for fetching records right after cursor by `limit`, will reverse back later
          )
          .where(
            orderBy.column as string,
            beforeWhereOperator,
            getOrderCursor(before)
          )
          .limit(last)
      : []

  const beforeEdges = beforeNodes
    .map((node) => ({
      cursor: encodeCursor(node[cursorColumn] as string),
      node,
    }))
    .reverse()

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
          getOrderCursor(after)
        )
        .limit(first)
    : before
    ? []
    : await knex.clone().from(baseTableName).limit(first)

  const afterEdges = afterNodes.map((node) => ({
    cursor: encodeCursor(node[cursorColumn] as string),
    node,
  }))

  const edges = before ? beforeEdges : afterEdges

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

/**
 * Construct a GQL connection from knex query using offset based pagination.
 * This is used as a fallback when cursor-based pagination is not available.
 */
const connectionFromQueryOffsetBased = async <T extends { id: string }>({
  query: baseQuery,
  args,
  orderBy,
  maxTake,
}: {
  query: Knex.QueryBuilder<T>
  orderBy: { column: keyof T; order: 'asc' | 'desc' }
  args: ConnectionArguments
  maxTake?: number
}): Promise<Connection<T>> => {
  const { after, before, first, includeAfter } = args
  if (before) {
    throw new UserInputError(
      'Cannot use `before` with offset based pagination.'
    )
  }
  const take =
    first === null ? MAX_TAKE_PER_PAGE : first ?? DEFAULT_TAKE_PER_PAGE
  const offset = includeAfter ? cursorToIndex(after) : cursorToIndex(after) + 1

  const knex = baseQuery.client.queryBuilder()
  const query = knex
    .select('*')
    .modify(selectWithTotalCount)
    .from(
      baseQuery
        .orderBy(orderBy.column as string, orderBy.order, 'last')
        .modify((builder) => {
          if (maxTake) {
            builder.limit(maxTake)
          }
        })
    )

  // Apply pagination
  const nodes = await query.offset(offset).limit(take)

  const totalCount = maxTake ? maxTake : nodes[0]?.totalCount || 0

  return connectionFromArray(nodes, args, totalCount)
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
