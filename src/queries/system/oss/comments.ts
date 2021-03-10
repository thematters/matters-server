import { connectionFromPromisedArray, cursorToIndex } from 'common/utils'
import { OSSToCommentsResolver } from 'definitions'

export const comments: OSSToCommentsResolver = async (
  root,
  { input: connectionArgs },
  { viewer, dataSources: { commentService } }
) => {
  const { first, after } = connectionArgs
  const offset = cursorToIndex(after) + 1
  const totalCount = await commentService.baseCount()

  return connectionFromPromisedArray(
    commentService.baseFind({
      offset,
      limit: first,
    }),
    connectionArgs,
    totalCount
  )
}
