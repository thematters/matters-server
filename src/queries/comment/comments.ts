import { connectionFromPromisedArray } from 'common/utils'
import { CommentToCommentsResolver } from 'definitions'

const resolver: CommentToCommentsResolver = (
  { id },
  { input: { author, sort, ...connectionArgs } },
  { dataSources: { commentService } }
) => {
  return connectionFromPromisedArray(
    commentService.findByParent({ id, author, sort }),
    connectionArgs
  )
}

export default resolver
