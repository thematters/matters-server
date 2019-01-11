import { connectionFromPromisedArray } from 'graphql-relay'

import { UserToFolloweesResolver } from 'definitions'

const resolver: UserToFolloweesResolver = async (
  { id },
  { input },
  { dataSources: { userService } }
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
