import { connectionFromPromisedArray, fromConnectionArgs } from 'common/utils'
import { OSSToCommentsResolver } from 'definitions'

export const comments: OSSToCommentsResolver = async (
  root,
  { input },
  { viewer, dataSources: { commentService } }
) => {
  const { take, skip } = fromConnectionArgs(input)

  const totalCount = await commentService.baseCount()

  return connectionFromPromisedArray(
    commentService.baseFind({ skip, take }),
    input,
    totalCount
  )
}
