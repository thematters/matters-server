import {
  connectionFromArray,
  connectionFromPromisedArray,
  cursorToIndex
} from 'common/utils'
import { UserToBlockListResolver } from 'definitions'

const resolver: UserToBlockListResolver = async (
  { id },
  { input },
  { dataSources: { userService } }
) => {
  if (!id) {
    return connectionFromArray([], input)
  }

  const { first, after } = input
  const offset = cursorToIndex(after) + 1
  const totalCount = await userService.countFollowers(id)
  const actions = await userService.findBlockList({
    targetId: id,
    offset,
    limit: first
  })

  return connectionFromPromisedArray(
    userService.dataloader.loadMany(
      actions.map(({ userId }: { userId: string }) => userId)
    ),
    input,
    totalCount
  )
}

export default resolver
