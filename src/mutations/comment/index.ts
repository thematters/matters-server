import putComment from './putComment'
import pinComment from './pinComment'
import deleteComment from './deleteComment'
import voteComment from './voteComment'
import unvoteComment from './unvoteComment'

export default {
  Mutation: {
    putComment,
    pinComment,
    deleteComment,
    voteComment,
    unvoteComment
  }
}
