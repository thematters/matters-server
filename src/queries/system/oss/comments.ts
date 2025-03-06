import type { GQLOssResolvers } from 'definitions/index.js'

import {
  connectionFromPromisedArray,
  fromConnectionArgs,
} from 'common/utils/index.js'

export const comments: GQLOssResolvers['comments'] = async (
  _,
  { input },
  { dataSources: { commentService } }
) => {
  const { take, skip } = fromConnectionArgs(input)

  const totalCount = await commentService.baseCount()

  return connectionFromPromisedArray(
    commentService.baseFind({
      skip,
      take,
      orderBy: [{ column: 'id', order: 'desc' }],
    }),
    input,
    totalCount
  )
}
