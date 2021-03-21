import invite from './invite'
import putCircle from './putCircle'
import putCircleArticles from './putCircleArticles'
import subscribeCircle from './subscribeCircle'
import toggleFollowCircle from './toggleFollowCircle'
import unsubscribeCircle from './unsubscribeCircle'

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
