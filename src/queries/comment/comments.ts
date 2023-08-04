import type { GQLCommentResolvers } from 'definitions'

import { connectionFromPromisedArray, fromConnectionArgs } from 'common/utils'

const resolver: GQLCommentResolvers['comments'] = (
  { id },
  { input: { author, sort, ...connectionArgs } },
  { dataSources: { commentService } }
) => {
  const { take, skip } = fromConnectionArgs(connectionArgs, {
    allowTakeAll: true,
  })

  return connectionFromPromisedArray(
    commentService.findByParent({ id, author, sort, skip, take }),
    connectionArgs
  )
}

export default resolver
