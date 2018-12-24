import { Resolver, BatchParams, Context } from 'definitions'

const resolver: Resolver = async (
  { id }: { id: string },
  { input: { offset, limit } }: BatchParams,
  { dataSources: { articleService, userService } }: Context
) => {
  const actions = await userService.findSubscriptionsInBatch(id, offset, limit)
  return articleService.dataloader.loadMany(
    actions.map(({ targetId }) => targetId)
  )
}

export default resolver
