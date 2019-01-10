import { Resolver, Context } from 'definitions'

const resolver: Resolver = async (
  { id }: { id: string },
  _,
  { dataSources: { articleService, userService } }: Context
) => {
  const actions = await articleService.findSubscriptionsInBatch(id, 0)
  return userService.dataloader.loadMany(actions.map(({ userId }) => userId))
}

export default resolver
