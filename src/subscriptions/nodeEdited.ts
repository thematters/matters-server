import { Context } from 'definitions'
import { fromGlobalId } from 'common/utils'

export default {
  Subscription: {
    nodeEdited: {
      resolve: (node: any, { input: { id } }: { input: { id: string } }) => {
        const { type } = fromGlobalId(id)
        console.log(type, node)
        return { ...node, __type: type }
      },
      subscribe: (
        _: any,
        { input: { id } }: { input: { id: string } },
        { dataSources: { notificationService } }: Context
      ) => {
        return notificationService.pubsubService.asyncIterator([id])
      }
    }
  }
}
