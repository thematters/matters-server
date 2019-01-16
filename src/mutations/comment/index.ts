import putComment from './putComment'
import pinComment from './pinComment'
import unpinComment from './unpinComment'
import deleteComment from './deleteComment'
import reportComment from './reportComment'
import voteComment from './voteComment'
import unvoteComment from './unvoteComment'

export default {
  Mutation: {
    putComment,
    pinComment,
    unpinComment,
    deleteComment,
    reportComment,
    voteComment,
    unvoteComment
  }
}
