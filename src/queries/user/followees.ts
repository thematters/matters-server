import { Resolver, BatchParams, Context } from 'definitions'

const resolver: Resolver = async (
  { id }: { id: string },
  { input: { offset, limit } }: BatchParams,
  { dataSources: { userService } }: Context
) => {
  const actions = await userService.findFollowees({
    userId: id,
    offset,
    limit
  })
  return userService.dataloader.loadMany(
    actions.map(({ targetId }: { targetId: string }) => targetId)
  )
}

export default resolver
