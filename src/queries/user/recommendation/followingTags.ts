import {
  connectionFromArray,
  connectionFromPromisedArray,
  cursorToIndex,
} from 'common/utils'
import { RecommendationToFollowingTagsResolver } from 'definitions'

export const followingTags: RecommendationToFollowingTagsResolver = async (
  { id }: { id: string },
  { input },
  { dataSources: { tagService, userService } }
) => {
  if (!id) {
    return connectionFromArray([], input)
  }

  const { first, after } = input
  const offset = cursorToIndex(after) + 1
  const [totalCount, tagIds] = await Promise.all([
    userService.countFollowingTags(id),
    userService.findFollowingTags({ userId: id, offset, limit: first }),
  ])

  return connectionFromPromisedArray(
    tagService.dataloader.loadMany(tagIds.map(({ targetId }) => targetId)),
    input,
    totalCount
  )
}
