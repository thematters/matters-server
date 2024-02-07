import type { GQLUserResolvers } from 'definitions'

import {
  connectionFromPromisedArray,
  connectionFromArray,
  fromConnectionArgs,
} from 'common/utils'

const resolver: GQLUserResolvers['pinnedTags'] = async (
  { id },
  { input },
  { dataSources: { tagService, atomService } }
) => {
  if (id === null) {
    return connectionFromArray([], input)
  }
  const { take, skip } = fromConnectionArgs(input, { defaultTake: 5 })

  const tagIds = await tagService.findPinnedTagsByUserId({
    userId: id,
    skip,
    take,
  })

  return connectionFromPromisedArray(
    atomService.tagIdLoader.loadMany(tagIds.map((tag) => tag.id)),
    input
  )
}

export default resolver
