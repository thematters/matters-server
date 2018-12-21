import { Resolver, BatchParams, Context } from 'definitions'

const resolver = async (
  { id }: { id: string },
  { input: { offset, limit } }: BatchParams,
  { articleService, userService }: Context
) => {
  const actions = await userService.findSubscriptionsInBatch(id, offset, limit)
  return articleService.idLoader.loadMany(
    actions.map(({ targetId }) => targetId)
  )
}

export default resolver
