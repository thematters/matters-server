import {
  connectionFromArray,
  connectionFromPromisedArray,
  fromConnectionArgs,
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

  const { take, skip } = fromConnectionArgs(input)

  const exclude = owner ? [owner] : []
  const totalCount = await tagService.countParticipants({ id, exclude })
  const userIds = await tagService.findParticipants({
    id,
    skip,
    take,
    exclude,
  })

  return connectionFromPromisedArray(
    userService.dataloader.loadMany(userIds.map(({ authorId }) => authorId)),
    input,
    totalCount
  )
}

export default resolver
