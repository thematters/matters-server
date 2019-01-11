import { Resolver, Context } from 'definitions'

const resolver: Resolver = async (
  { id }: { id: string },
  _,
  { dataSources: { articleService, userService } }: Context
) => {
  // TODO: get participantes from comments
  const actions = await articleService.findSubscriptions(id)
  return userService.dataloader.loadMany(actions.map(({ userId }) => userId))
}

export default resolver
