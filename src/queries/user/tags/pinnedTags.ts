import { connectionFromPromisedArray, fromConnectionArgs } from 'common/utils'
import { UserToPinnedTagsResolver } from 'definitions'

const resolver: UserToPinnedTagsResolver = async (
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
    tagService.dataloader.loadMany(tagIds.map((tag: any) => `${tag.id}`)),
    input
  )
}

export default resolver
