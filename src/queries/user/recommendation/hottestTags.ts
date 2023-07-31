import type { GQLRecommendationResolvers } from 'definitions'

import { chunk } from 'lodash'

import {
  connectionFromArray,
  connectionFromPromisedArray,
  fromConnectionArgs,
} from 'common/utils'

export const hottestTags: GQLRecommendationResolvers['hottestTags'] = async (
  _,
  { input },
  { dataSources: { userService } }
) => {
  const { filter } = input
  const { take, skip } = fromConnectionArgs(input)

  /**
   * Pick randomly
   */
  if (typeof filter?.random === 'number') {
    const MAX_RANDOM_INDEX = 50
    const randomDraw = input.first || 5

    const tagPool = await userService.recommendTags({
      skip: 0,
      take: MAX_RANDOM_INDEX * randomDraw,
    })

    const chunks = chunk(tagPool, randomDraw)
    const index = Math.min(filter.random, MAX_RANDOM_INDEX, chunks.length - 1)
    const tags = chunks[index] || []

    return connectionFromArray(tags, input, tagPool.length)
  }

  const totalCount = await userService.countRecommendTags()

  return connectionFromPromisedArray(
    userService.recommendTags({ skip, take }),
    input,
    totalCount
  )
}
