import applyMomentFeed from './applyMomentFeed.js'
import deleteMoment from './deleteMoment.js'
import { likeMoment, unlikeMoment } from './likeMoment.js'
import putMoment from './putMoment.js'
import updateMomentFeedApplicationState from './updateMomentFeedApplicationState.js'

export default {
  Mutation: {
    putMoment,
    deleteMoment,
    likeMoment,
    unlikeMoment,
    applyMomentFeed,
    updateMomentFeedApplicationState,
  },
}
