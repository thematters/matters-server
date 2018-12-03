import { Context } from 'src/definitions'

import article from './article'
import author from './author'
import myVote from './myVote'
import mentions from './mentions'
import comments from './comments'
import parentComment from './parentComment'

export default {
  User: {
    comments: (
      { uuid }: { uuid: string },
      _: any,
      { commentService }: Context
    ) => commentService.findByAuthor(uuid)
  },
  Comment: {
    article,
    author,
    myVote,
    mentions,
    comments,
    // hasCitation,
    parentComment
  }
}
