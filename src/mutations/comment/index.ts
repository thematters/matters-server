import putComment from './putComment'
import pinComment from './pinComment'
import deleteComment from './deleteComment'
import reportComment from './reportComment'
import voteComment from './voteComment'
import unvoteComment from './unvoteComment'

export default {
  Mutation: {
    putComment,
    pinComment,
    deleteComment,
    reportComment,
    voteComment,
    unvoteComment
  }
}
