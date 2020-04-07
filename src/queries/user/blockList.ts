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
  const totalCount = await userService.countBlockList(id)
  const actions = await userService.findBlockList({
    userId: id,
    offset,
    limit: first
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
