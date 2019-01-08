import { connectionFromPromisedArray } from 'graphql-relay'
import { Context, UserToSubscriptionsResolver } from 'definitions'

const resolver: UserToSubscriptionsResolver = async (
  { id }: { id: string },
  { input },
  { dataSources: { articleService, userService } }: Context
) => {
  const actions = await userService.findSubscriptions(id)
  return connectionFromPromisedArray(
    articleService.dataloader.loadMany(actions.map(({ targetId }) => targetId)),
    input
  )
}

export default resolver
