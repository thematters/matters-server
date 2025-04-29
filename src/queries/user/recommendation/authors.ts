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
  { dataSources: { userService, recommendationService, atomService }, viewer }
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

  const limit = 50
  const draw = input.first || 5
  const _take = limit * draw

  /**
   * new algo
   */
  if (input.newAlgo) {
    const { query } = await recommendationService.recommendAuthors(
      input.filter?.channelId
    )
    const authorIds = await query.whereNotIn('author_id', notIn).limit(_take)
    const chunks = chunk(authorIds, draw)
    const index = Math.min(filter?.random || 0, limit, chunks.length - 1)
    const randomAuthorIds = chunks[index] || []
    const randomAuthors = await atomService.userIdLoader.loadMany(
      randomAuthorIds.map(({ authorId }) => authorId)
    )

    return connectionFromArray(randomAuthors, input, authorIds.length)
  }

  /**
   * old algo
   */
  if (typeof filter?.random === 'number') {
    const authorPool = await userService.recommendAuthors({
      take: _take,
      notIn,
      oss,
    })

    const chunks = chunk(authorPool, draw)
    const index = Math.min(filter.random, limit, chunks.length - 1)
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
