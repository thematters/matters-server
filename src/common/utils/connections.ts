import * as base64 from 'base-64'
import { connectionFromArraySlice } from 'graphql-relay'

export type ConnectionCursor = string

export type ConnectionArguments = {
  before?: ConnectionCursor
  after?: ConnectionCursor
  first?: number
  last?: number
}

export type ConnectionHelpers = {
  offset: number
  totalCount: number
}

export type Connection<T> = {
  totalCount?: number
  edges: Array<Edge<T>>
  pageInfo: PageInfo
}

export type Edge<T> = {
  node: T
  cursor: ConnectionCursor
}

export type PageInfo = {
  startCursor?: ConnectionCursor | null
  endCursor?: ConnectionCursor | null
  hasPreviousPage?: boolean | null
  hasNextPage?: boolean | null
}

type ArraySliceMetaInfo = {
  sliceStart: number
  arrayLength: number
}

const PREFIX = 'arrayconnection'

export const cursorToOffset = (
  cursor: ConnectionCursor | undefined
): number => {
  return cursor ? parseInt(base64.decode(cursor).split(':')[1], 10) : -1
}

export const cursorToIndex = (cursor: ConnectionCursor | undefined): number => {
  return cursor ? parseInt(base64.decode(cursor).split(':')[1], 10) : -1
}

export const indexToCursor = (index: number): ConnectionCursor => {
  return base64.encode(`${PREFIX}:${index}`)
}

export function connectionFromArray<T>(
  data: Array<T>,
  args: ConnectionArguments,
  totalCount?: number
): Connection<T> {
  if (totalCount) {
    const { after } = args
    const offset = cursorToIndex(after) + 1

    const edges = data.map((value, index) => ({
      cursor: indexToCursor(index + offset),
      node: value
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
          : false
      }
    }
  }

  return {
    ...connectionFromArraySlice(data, args, {
      sliceStart: 0,
      arrayLength: data.length
    }),
    totalCount: data.length
  }
}

export function connectionFromPromisedArray<T>(
  dataPromise: Promise<Array<T>>,
  args: ConnectionArguments,
  totalCount?: number
): Promise<Connection<T>> {
  return dataPromise.then(data => connectionFromArray(data, args, totalCount))
}
