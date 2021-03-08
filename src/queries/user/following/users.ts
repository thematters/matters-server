import {
  connectionFromArray,
  connectionFromPromisedArray,
  cursorToIndex,
} from 'common/utils'
import { FollowingToUsersResolver } from 'definitions'

const resolver: FollowingToUsersResolver = async (
  { id },
  { input },
  { dataSources: { userService } }
) => {
  if (!id) {
    return connectionFromArray([], input)
  }

  const { first, after } = input
  const offset = cursorToIndex(after) + 1
  const totalCount = await userService.countFollowees(id)
  const actions = await userService.findFollowees({
    userId: id,
    offset,
    limit: first,
  })

  return connectionFromPromisedArray(
    userService.dataloader.loadMany(
      actions.map(({ targetId }: { targetId: string }) => targetId)
    ),
    input,
    totalCount
  )
}

export default resolver
