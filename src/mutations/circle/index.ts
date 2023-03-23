import invite from './invite.js'
import putCircle from './putCircle.js'
import putCircleArticles from './putCircleArticles.js'
import subscribeCircle from './subscribeCircle.js'
import toggleFollowCircle from './toggleFollowCircle.js'
import unsubscribeCircle from './unsubscribeCircle.js'

export default {
  Mutation: {
    putCircle,
    subscribeCircle,
    toggleFollowCircle,
    unsubscribeCircle,
    putCircleArticles,
    invite,
  },
}
