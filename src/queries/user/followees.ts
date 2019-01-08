import { Context, UserToFolloweesResolver } from 'definitions'
import { connectionFromPromisedArray } from 'graphql-relay'

const resolver: UserToFolloweesResolver = async (
  { id }: { id: string },
  { input },
  { dataSources: { userService } }: Context
) => {
  const actions = await userService.findFollowees(id)
  return connectionFromPromisedArray(
    userService.dataloader.loadMany(
      actions.map(({ targetId }: { targetId: string }) => targetId)
    ),
    input
  )
}

export default resolver
