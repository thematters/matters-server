import { connectionFromPromisedArray } from 'common/utils'

import { UserToFollowersResolver } from 'definitions'

const resolver: UserToFollowersResolver = async (
  { id },
  { input },
  { dataSources: { userService } }
) => {
  const actions = await userService.findFollowers(id)

  return connectionFromPromisedArray(
    userService.dataloader.loadMany(
      actions.map(({ userId }: { userId: string }) => userId)
    ),
    input
  )
}

export default resolver
