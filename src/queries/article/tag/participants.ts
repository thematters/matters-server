import type { GQLTagResolvers } from 'definitions'

import {
  connectionFromArray,
  connectionFromPromisedArray,
  fromConnectionArgs,
} from 'common/utils'

const resolver: GQLTagResolvers['participants'] = async (
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
    userService.loadByIds(userIds.map(({ authorId }) => authorId)),
    input,
    totalCount
  )
}

export default resolver
