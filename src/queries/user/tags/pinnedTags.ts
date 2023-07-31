import type { GQLUserResolvers } from 'definitions'

import { connectionFromPromisedArray, fromConnectionArgs } from 'common/utils'

const resolver: GQLUserResolvers['pinnedTags'] = async (
  { id },
  { input },
  { dataSources: { tagService, userService } }
) => {
  const { take, skip } = fromConnectionArgs(input, { defaultTake: 5 })

  const tagIds = await tagService.findPinnedTagsByUserId({
    userId: id,
    skip,
    take,
  })

  return connectionFromPromisedArray(
    // tagService.findPinnedTagsByUserId(id),
    tagService.loadByIds(tagIds.map((tag: any) => `${tag.id}`)),
    input
  )
}

export default resolver
