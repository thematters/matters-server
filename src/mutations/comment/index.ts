import deleteComment from './deleteComment'
import pinComment from './pinComment'
import putComment from './putComment'
import reportComment from './reportComment'
import unpinComment from './unpinComment'
import unvoteComment from './unvoteComment'
import updateCommentState from './updateCommentState'
import voteComment from './voteComment'

export default {
  Mutation: {
    putComment,
    pinComment,
    unpinComment,
    deleteComment,
    reportComment,
    voteComment,
    unvoteComment,
    updateCommentState
  }
}
