import {
  connectionFromArray,
  connectionFromPromisedArray,
  cursorToIndex,
} from 'common/utils'
import { TagToParticipantsResolver } from 'definitions'

const resolver: TagToParticipantsResolver = async (
  { id, owner },
  { input },
  { dataSources: { tagService, userService } }
) => {
  if (!id) {
    return connectionFromArray([], input)
  }
  const { first, after } = input
  const offset = cursorToIndex(after) + 1

  const exclude = owner ? [owner] : []
  const totalCount = await tagService.countParticipants({ id, exclude })
  const userIds = await tagService.findParticipants({
    id,
    offset,
    limit: first,
    exclude,
  })

  return connectionFromPromisedArray(
    userService.dataloader.loadMany(userIds.map(({ authorId }) => authorId)),
    input,
    totalCount
  )
}

export default resolver
