import { connectionFromArraySlice } from 'graphql-relay'
import { Base64 } from 'js-base64'

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

interface ArraySliceMetaInfo {
  sliceStart: number
  arrayLength: number
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

export const indexToCursor = (index: number): ConnectionCursor => {
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

  const connections = connectionFromArraySlice(data, args, {
    sliceStart: 0,
    arrayLength: data.length
  })

  return {
    ...connections,
    totalCount: data.length
  }
}

export function connectionFromPromisedArray<T>(
  dataPromise: Promise<T[]>,
  args: ConnectionArguments,
  totalCount?: number
): Promise<Connection<T>> {
  return dataPromise.then(data => connectionFromArray(data, args, totalCount))
}

export const loadManyFilterError = (items: Array<Item | Error>) => {
  return items.filter((item: Item | Error) => {
    if (item instanceof Error) {
      return false
    }

    return true
  }) as Item[]
}
