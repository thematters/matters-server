import { AuthenticationError } from 'common/errors'
import { connectionFromPromisedArray, cursorToIndex } from 'common/utils'
import { RecommendationToFollowTagsResolver } from 'definitions'

export const followTags: RecommendationToFollowTagsResolver = async (
  { id }: { id: string },
  { input },
  { dataSources: { tagService, userService } }
) => {
  if (!id) {
    throw new AuthenticationError('visitor has no permission')
  }

  const { first, after } = input
  const offset = cursorToIndex(after) + 1
  const [totalCount, tagIds] = await Promise.all([
    userService.countFollowTagsArticles(id),
    userService.followTagsArticles({ userId: id, offset, limit: first }),
  ])

  return connectionFromPromisedArray(
    tagService.dataloader.loadMany(tagIds.map((tagId) => tagId.id)),
    input,
    totalCount
  )
}
