import { Context } from 'src/definitions'

import article from './article'
import author from './author'
import mentions from './mentions'
import comments from './comments'
import parentComment from './parentComment'

export default {
  User: {
    comments: ({ id }: { id: number }, _: any, { commentService }: Context) =>
      commentService.findByAuthor(id)
  },

  Comment: {
    article,
    author,
    mentions,
    comments,
    parentComment
  }
}
