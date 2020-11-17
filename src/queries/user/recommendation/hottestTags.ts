import { sampleSize } from 'lodash'

import {
  connectionFromArray,
  connectionFromPromisedArray,
  cursorToIndex,
} from 'common/utils'
import { RecommendationToHottestTagsResolver } from 'definitions'

export const hottestTags: RecommendationToHottestTagsResolver = async (
  _,
  { input },
  { dataSources: { userService } }
) => {
  const { first, after, filter } = input

  /**
   * Pick randomly
   */
  if (typeof filter?.random === 'number') {
    const MAX_RANDOM_INDEX = 50
    const randomDraw = first || 5

    const authorPool = await userService.recommendTags({
      limit: MAX_RANDOM_INDEX * randomDraw,
    })

    const filteredAuthors = sampleSize(authorPool, MAX_RANDOM_INDEX) || []

    return connectionFromArray(filteredAuthors, input, authorPool.length)
  }

  const offset = cursorToIndex(after) + 1
  const totalCount = await userService.countRecommendTags()

  return connectionFromPromisedArray(
    userService.recommendTags({
      limit: first,
      offset,
    }),
    input,
    totalCount
  )
}
