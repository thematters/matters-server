import {
  connectionFromPromisedArray,
  fromConnectionArgs,
} from 'common/utils/index.js'
import { CommentToCommentsResolver } from 'definitions'

const resolver: CommentToCommentsResolver = (
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
