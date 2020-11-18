import { chunk } from 'lodash'

import { ForbiddenError } from 'common/errors'
import {
  connectionFromArray,
  connectionFromPromisedArray,
  cursorToIndex,
} from 'common/utils'
import { GQLAuthorsType, RecommendationToAuthorsResolver } from 'definitions'

export const authors: RecommendationToAuthorsResolver = async (
  { id },
  { input },
  { dataSources: { userService }, viewer }
) => {
  const {
    first,
    after,
    filter,
    oss = false,
    type = GQLAuthorsType.default,
  } = input

  if (oss) {
    if (!viewer.hasRole('admin')) {
      throw new ForbiddenError('only admin can access oss')
    }
  }

  const isDefault = type === GQLAuthorsType.default
  const isAppreciated = type === GQLAuthorsType.appreciated

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
   * Filter out top 60 trendy authors if type is most appreciated
   */
  if (isAppreciated) {
    const trendyAuthors = await userService.recommendAuthor({ limit: 60, type })
    notIn = [...notIn, ...trendyAuthors.map((author) => author.id)]
  }

  /**
   * Pick randomly
   */
  if (typeof filter?.random === 'number') {
    const MAX_RANDOM_INDEX = isDefault ? 50 : 6
    const randomDraw = isDefault ? first || 5 : 10

    const authorPool = await userService.recommendAuthor({
      limit: MAX_RANDOM_INDEX * randomDraw,
      notIn,
      oss,
      type,
    })

    const chunks = chunk(authorPool, randomDraw)
    const index = Math.min(filter.random, MAX_RANDOM_INDEX, chunks.length - 1)
    const filteredAuthors = chunks[index] || []

    return connectionFromArray(filteredAuthors, input, authorPool.length)
  }

  const offset = cursorToIndex(after) + 1
  const totalCount = await userService.countAuthor({
    notIn,
    type,
  })

  return connectionFromPromisedArray(
    userService.recommendAuthor({
      offset,
      notIn,
      limit: first,
      type,
    }),
    input,
    totalCount
  )
}
