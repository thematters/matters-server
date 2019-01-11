import { fromGlobalId } from 'common/utils'
import { SubscriptionToNodeEditedResolver } from 'definitions'

const resolver: {
  Subscription: { nodeEdited: SubscriptionToNodeEditedResolver }
} = {
  Subscription: {
    nodeEdited: {
      resolve: (node: any, { input: { id } }: { input: { id: string } }) => {
        const { type } = fromGlobalId(id)
        return { ...node, __type: type }
      },
      subscribe: (
        _: any,
        { input: { id } }: { input: { id: string } },
        { dataSources: { notificationService } }
      ) => {
        return notificationService.pubsubService.engine.asyncIterator([id])
      }
    }
  }
}

export default resolver
