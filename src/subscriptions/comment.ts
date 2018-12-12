import { PUBSUB_EVENT } from 'common/enums'
import pubsub from 'common/pubsub'

export default {
  Subscription: {
    commentChanged: {
      resolve: (comment: any) => comment,
      subscribe: () => {
        return pubsub.asyncIterator([
          PUBSUB_EVENT.commentCreated,
          PUBSUB_EVENT.commentUpdated,
          PUBSUB_EVENT.commentDeleted
        ])
      }
    }
  }
}
