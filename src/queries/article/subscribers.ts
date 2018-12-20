import { Resolver, BatchParams, Context } from 'definitions'

const resolver: Resolver = async (
  { id }: { id: string },
  { input: { offset, limit } }: BatchParams,
  { articleService, userService }: Context
) => {
  const actions = await articleService.findSubscriptionsInBatch(
    id,
    offset,
    limit
  )
  return userService.idLoader.loadMany(actions.map(({ userId }) => userId))
}

export default resolver
