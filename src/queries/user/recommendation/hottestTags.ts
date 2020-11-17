import { chunk } from 'lodash'

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

    const tagPool = await userService.recommendTags({
      limit: MAX_RANDOM_INDEX * randomDraw,
    })

    const chunks = chunk(tagPool, randomDraw)
    const index = Math.min(filter.random, MAX_RANDOM_INDEX, chunks.length - 1)
    const tags = chunks[index] || []

    return connectionFromArray(tags, input, tagPool.length)
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
