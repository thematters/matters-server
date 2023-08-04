import type { GQLRecommendationResolvers } from 'definitions'

import { chunk } from 'lodash'

import { connectionFromArray, fromConnectionArgs } from 'common/utils'

export const selectedTags: GQLRecommendationResolvers['selectedTags'] = async (
  _,
  { input },
  { dataSources: { tagService } }
) => {
  const { filter } = input
  const { take, skip } = fromConnectionArgs(input)

  /**
   * Pick randomly
   */
  if (typeof filter?.random === 'number') {
    const MAX_RANDOM_INDEX = 50
    const randomDraw = input.first || 5

    const tagPool = await tagService.selected({
      take: MAX_RANDOM_INDEX * randomDraw,
    })

    const chunks = chunk(tagPool, randomDraw)
    const index = Math.min(filter.random, MAX_RANDOM_INDEX, chunks.length - 1)
    const pickedTags = chunks[index] || []

    return connectionFromArray(pickedTags, input, tagPool.length)
  }

  const [totalCount, tags] = await Promise.all([
    tagService.countSelectedTags(),
    tagService.selected({ skip, take }),
  ])
  return connectionFromArray(tags, input, totalCount)
}
