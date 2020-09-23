import deleteComment from './deleteComment'
import pinComment from './pinComment'
import putComment from './putComment'
import togglePinComment from './togglePinComment'
import unpinComment from './unpinComment'
import unvoteComment from './unvoteComment'
import updateCommentsState from './updateCommentsState'
import voteComment from './voteComment'

export default {
  Mutation: {
    putComment,
    pinComment,
    unpinComment,
    deleteComment,
    voteComment,
    unvoteComment,
    updateCommentsState,
    togglePinComment,
  },
}
