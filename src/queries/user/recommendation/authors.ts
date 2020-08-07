import { chunk } from 'lodash'

import { ForbiddenError } from 'common/errors'
import {
  connectionFromArray,
  connectionFromPromisedArray,
  cursorToIndex,
} from 'common/utils'
import { RecommendationToAuthorsResolver } from 'definitions'

export const authors: RecommendationToAuthorsResolver = async (
  { id },
  { input },
  { dataSources: { userService }, viewer }
) => {
  const { first, after, filter, oss = false } = input

  if (oss) {
    if (!viewer.hasRole('admin')) {
      throw new ForbiddenError('only admin can access oss')
    }
  }

  /**
   * Filter out followed users
   */
  let notIn: any[] = id ? [id] : []
  if (filter?.followed === false && id) {
    // TODO: move this logic to db layer
    const followees = await userService.findFollowees({
      userId: id,
      limit: 999,
    })
    notIn = [...notIn, ...followees.map(({ targetId }: any) => targetId)]
  }

  /**
   * Pick randomly
   */
  if (typeof filter?.random === 'number') {
    const MAX_RANDOM_INDEX = 50
    const randomDraw = first || 5
    const index = Math.min(filter.random, MAX_RANDOM_INDEX)

    const authorPool = await userService.recommendAuthor({
      limit: MAX_RANDOM_INDEX * randomDraw,
      notIn,
      oss,
    })

    return connectionFromArray(
      chunk(authorPool, randomDraw)[index],
      input,
      authorPool.length
    )
  }

  const offset = cursorToIndex(after) + 1
  const totalCount = await userService.countAuthor({
    notIn,
  })

  return connectionFromPromisedArray(
    userService.recommendAuthor({
      offset,
      notIn,
      limit: first,
    }),
    input,
    totalCount
  )
}
