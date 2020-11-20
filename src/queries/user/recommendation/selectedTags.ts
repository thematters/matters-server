import { chunk } from 'lodash'

import { connectionFromArray, cursorToIndex } from 'common/utils'
import { RecommendationToSelectedTagsResolver } from 'definitions'

export const selectedTags: RecommendationToSelectedTagsResolver = async (
  _,
  { input },
  { dataSources: { tagService } }
) => {
  const { first, after, filter } = input

  /**
   * Pick randomly
   */
  if (typeof filter?.random === 'number') {
    const MAX_RANDOM_INDEX = 50
    const randomDraw = first || 5

    const tagPool = await tagService.selected({
      limit: MAX_RANDOM_INDEX * randomDraw,
    })

    const chunks = chunk(tagPool, randomDraw)
    const index = Math.min(filter.random, MAX_RANDOM_INDEX, chunks.length - 1)
    const pickedTags = chunks[index] || []

    return connectionFromArray(pickedTags, input, tagPool.length)
  }

  const offset = cursorToIndex(after) + 1

  const [totalCount, tags] = await Promise.all([
    tagService.countSelectedTags(),
    tagService.selected({
      offset,
      limit: first,
    }),
  ])
  return connectionFromArray(tags, input, totalCount)
}
