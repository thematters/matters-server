import { Resolver, BatchParams, Context } from 'definitions'

const resolver = async (
  { id }: { id: string },
  { input: { offset, limit } }: BatchParams,
  { userService }: Context
) => {
  const actions = await userService.findFollowees({
    userId: id,
    offset,
    limit
  })
  return userService.idLoader.loadMany(
    actions.map(({ targetId }: { targetId: string }) => targetId)
  )
}

export default resolver
