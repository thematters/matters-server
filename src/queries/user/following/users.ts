import {
  connectionFromArray,
  connectionFromPromisedArray,
  fromConnectionArgs,
} from 'common/utils/index.js'
import { FollowingToUsersResolver } from 'definitions'

const resolver: FollowingToUsersResolver = async (
  { id },
  { input },
  { dataSources: { userService } }
) => {
  if (!id) {
    return connectionFromArray([], input)
  }

  const { take, skip } = fromConnectionArgs(input)

  const totalCount = await userService.countFollowees(id)
  const actions = await userService.findFollowees({ userId: id, skip, take })

  return connectionFromPromisedArray(
    userService.dataloader.loadMany(
      actions.map(({ targetId }: { targetId: string }) => targetId)
    ),
    input,
    totalCount
  )
}

export default resolver
