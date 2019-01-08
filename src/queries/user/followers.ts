import { Context, UserToFollowersResolver } from 'definitions'
import { connectionFromPromisedArray } from 'graphql-relay'

const resolver: UserToFollowersResolver = async (
  { id }: { id: string },
  { input },
  { dataSources: { userService } }: Context
) => {
  const actions = await userService.findFollowers(id)

  return connectionFromPromisedArray(
    userService.dataloader.loadMany(actions.map(({ userId }) => userId)),
    input
  )
}

export default resolver
