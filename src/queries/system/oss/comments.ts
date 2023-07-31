import type { GQLOSSResolvers } from 'definitions'

import { connectionFromPromisedArray, fromConnectionArgs } from 'common/utils'

export const comments: GQLOSSResolvers['comments'] = async (
  _,
  { input },
  { dataSources: { commentService } }
) => {
  const { take, skip } = fromConnectionArgs(input)

  const totalCount = await commentService.baseCount()

  return connectionFromPromisedArray(
    commentService.baseFind({ skip, take }),
    input,
    totalCount
  )
}
