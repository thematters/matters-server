import type { GQLTagResolvers } from 'definitions'

import {
  connectionFromArray,
  connectionFromPromisedArray,
  fromConnectionArgs,
} from 'common/utils'

const resolver: GQLTagResolvers['participants'] = async (
  { id, owner },
  { input },
  { dataSources: { tagService, atomService } }
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
    atomService.userIdLoader.loadMany(userIds.map(({ authorId }) => authorId)),
    input,
    totalCount
  )
}

export default resolver
