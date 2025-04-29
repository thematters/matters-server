import type { GQLRecommendationResolvers, User } from '#definitions/index.js'

import { ForbiddenError } from '#common/errors.js'
import {
  connectionFromArray,
  connectionFromPromisedArray,
  fromConnectionArgs,
} from '#common/utils/index.js'
import chunk from 'lodash/chunk.js'

export const authors: GQLRecommendationResolvers['authors'] = async (
  { id },
  { input },
  { dataSources: { userService }, viewer }
) => {
  const { filter, oss = false } = input
  const { take, skip } = fromConnectionArgs(input)

  if (oss) {
    if (!viewer.hasRole('admin')) {
      throw new ForbiddenError('only admin can access oss')
    }
  }

  /**
   * Filter out followed users
   */
  let notIn: string[] = id ? [id] : []
  if (filter?.followed === false && id) {
    // TODO: move this logic to db layer
    const followees = await userService.findFollowees({
      userId: id,
      take: 999,
    })
    notIn = [
      ...notIn,
      ...followees.map(({ targetId }: { targetId: string }) => targetId),
    ]
  }

  /**
   * Pick randomly
   */
  if (typeof filter?.random === 'number') {
    const MAX_RANDOM_INDEX = 50
    const randomDraw = input.first || 5
    const _take = MAX_RANDOM_INDEX * randomDraw

    const authorPool = await userService.recommendAuthors({
      take: _take,
      notIn,
      oss,
    })

    const chunks = chunk(authorPool, randomDraw)
    const index = Math.min(filter.random, MAX_RANDOM_INDEX, chunks.length - 1)
    const filteredAuthors = chunks[index] || []

    return connectionFromArray(
      filteredAuthors as User[],
      input,
      authorPool.length
    )
  }

  const users = await userService.recommendAuthors({
    skip,
    take,
    notIn,
    count: true,
  })
  const totalCount = +users[0]?.totalCount || users.length

  return connectionFromPromisedArray(users as User[], input, totalCount)
}
