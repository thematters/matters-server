import { connectionFromPromisedArray } from 'common/utils'

import { CommentToCommentsResolver } from 'definitions'

const resolver: CommentToCommentsResolver = (
  { id },
  { input },
  { dataSources: { commentService } }
) => {
  return connectionFromPromisedArray(commentService.findByParent(id), input)
}

export default resolver
