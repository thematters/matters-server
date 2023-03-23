import deleteComment from './deleteComment.js'
import pinComment from './pinComment.js'
import putComment from './putComment.js'
import togglePinComment from './togglePinComment.js'
import unpinComment from './unpinComment.js'
import unvoteComment from './unvoteComment.js'
import updateCommentsState from './updateCommentsState.js'
import voteComment from './voteComment.js'

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
