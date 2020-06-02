import { ForbiddenError } from 'common/errors'
import { connectionFromPromisedArray, cursorToIndex } from 'common/utils'
import { RecommendationToTagsResolver } from 'definitions'

export const tags: RecommendationToTagsResolver = async (
  { id },
  { input },
  { dataSources: { tagService }, viewer }
) => {
  const { oss = false } = input

  if (oss) {
    if (!viewer.hasRole('admin')) {
      throw new ForbiddenError('only admin can access oss')
    }
  }

  const { first, after } = input
  const offset = cursorToIndex(after) + 1
  const totalCount = await tagService.baseCount()
  return connectionFromPromisedArray(
    tagService.recommendTags({
      offset,
      limit: first,
      oss,
    }),
    input,
    totalCount
  )
}
