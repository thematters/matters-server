import { Resolver, BatchParams, Context } from 'definitions'

const resolver = async (
  { id }: { id: string },
  { input: { offset, limit } }: BatchParams,
  { userService }: Context
) => {
  const actions = await userService.findFollowersInBatch(id, offset, limit)
  return userService.dataloader.loadMany(actions.map(({ userId }) => userId))
}

export default resolver
