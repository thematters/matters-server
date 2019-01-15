import * as base64 from 'base-64'

export type ConnectionCursor = string

export type ConnectionArguments = {
  before?: ConnectionCursor
  after?: ConnectionCursor
  first?: number
  last?: number
}

export type Connection<T> = {
  edges: Array<Edge<T>>
  pageInfo: PageInfo
}

export type Edge<T> = {
  node: T
  cursor: ConnectionCursor
}

export type PageInfo = {
  startCursor: ConnectionCursor
  endCursor: ConnectionCursor
  hasPreviousPage: boolean
  hasNextPage: boolean
}

type ArraySliceMetaInfo = {
  sliceStart: number
  arrayLength: number
}

const PREFIX = 'arrayconnection:'

export function cursorToOffset(cursor: ConnectionCursor): number {
  return parseInt(base64.decode(cursor).substring(PREFIX.length), 10)
}

export function offsetToCursor(offset: number): ConnectionCursor {
  return base64.encode(PREFIX + offset)
}

export function getOffsetWithDefault(
  cursor: ConnectionCursor,
  defaultOffset: number
): number {
  if (typeof cursor !== 'string') {
    return defaultOffset
  }
  const offset = cursorToOffset(cursor)
  return isNaN(offset) ? defaultOffset : offset
}

export function connectionFromArraySlice<T>(
  arraySlice: Array<T>,
  args: ConnectionArguments,
  meta: ArraySliceMetaInfo
): Connection<T> {
  const { after, before, first, last } = args
  const { sliceStart, arrayLength } = meta
  const sliceEnd = sliceStart + arraySlice.length
  const beforeOffset = getOffsetWithDefault(before || '', arrayLength)
  const afterOffset = getOffsetWithDefault(after || '', -1)

  let startOffset = Math.max(sliceStart - 1, afterOffset, -1) + 1
  let endOffset = Math.min(sliceEnd, beforeOffset, arrayLength)

  if (typeof first === 'number') {
    if (first < 0) {
      throw new Error('Argument "first" must be a non-negative integer')
    }

    endOffset = Math.min(endOffset, startOffset + first)
  }

  if (typeof last === 'number') {
    if (last < 0) {
      throw new Error('Argument "last" must be a non-negative integer')
    }

    startOffset = Math.max(startOffset, endOffset - last)
  }

  // If supplied slice is too large, trim it down before mapping over it.
  const slice = arraySlice.slice(
    Math.max(startOffset - sliceStart, 0),
    arraySlice.length - (sliceEnd - endOffset)
  )

  const edges = slice.map((value, index) => ({
    cursor: offsetToCursor(startOffset + index),
    node: value
  }))

  const firstEdge = edges[0]
  const lastEdge = edges[edges.length - 1]
  const lowerBound = after ? afterOffset + 1 : 0
  const upperBound = before ? beforeOffset : arrayLength

  return {
    edges,
    pageInfo: {
      startCursor: firstEdge ? firstEdge.cursor : '',
      endCursor: lastEdge ? lastEdge.cursor : '',
      hasPreviousPage:
        typeof last === 'number' ? startOffset > lowerBound : false,
      hasNextPage: typeof first === 'number' ? endOffset < upperBound : false
    }
  }
}

export function connectionFromArray<T>(
  data: Array<T>,
  args: ConnectionArguments
): Connection<T> {
  return connectionFromArraySlice(data, args, {
    sliceStart: 0,
    arrayLength: data.length
  })
}

export function connectionFromPromisedArray<T>(
  dataPromise: Promise<Array<T>>,
  args: ConnectionArguments
): Promise<Connection<T>> {
  return dataPromise.then(data => connectionFromArray(data, args))
}
