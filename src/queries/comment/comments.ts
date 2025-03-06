import type { GQLCommentResolvers } from '#definitions/index.js'

import { connectionFromArray, fromConnectionArgs } from '#common/utils/index.js'

const resolver: GQLCommentResolvers['comments'] = async (
  { id },
  { input: { author, sort, ...connectionArgs } },
  { dataSources: { commentService } }
) => {
  const { take, skip } = fromConnectionArgs(connectionArgs, {
    allowTakeAll: true,
  })

  const [comments, totalCount] = await commentService.findByParent({
    id,
    author,
    sort,
    skip,
    take,
  })
  return connectionFromArray(comments, connectionArgs, totalCount)
}

export default resolver
