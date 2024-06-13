import type { GQLRecommendationResolvers } from 'definitions'

import { chunk } from 'lodash'

import { AUTHOR_TYPE } from 'common/enums'
import { ForbiddenError } from 'common/errors'
import {
  connectionFromArray,
  connectionFromPromisedArray,
  fromConnectionArgs,
} from 'common/utils'

export const authors: GQLRecommendationResolvers['authors'] = async (
  { id },
  { input },
  { dataSources: { userService }, viewer }
) => {
  const { filter, oss = false, type = AUTHOR_TYPE.default } = input
  const { take, skip } = fromConnectionArgs(input)

  if (oss) {
    if (!viewer.hasRole('admin')) {
      throw new ForbiddenError('only admin can access oss')
    }
  }

  const isDefault = type === AUTHOR_TYPE.default
  const isAppreciated = type === AUTHOR_TYPE.appreciated

  /**
   * Filter out followed users
   */
  let notIn: any[] = id ? [id] : []
  if (filter?.followed === false && id) {
    // TODO: move this logic to db layer
    const followees = await userService.findFollowees({
      userId: id,
      take: 999,
    })
    notIn = [...notIn, ...followees.map(({ targetId }: any) => targetId)]
  }

  /**
   * Filter out top 60 trendy authors if type is most appreciated
   */
  if (isAppreciated) {
    const trendyAuthors = await userService.recommendAuthors({ take: 60, type })
    notIn = [
      ...notIn,
      ...trendyAuthors.map((author: { id: string }) => author.id),
    ]
  }

  /**
   * Pick randomly
   */
  if (typeof filter?.random === 'number') {
    const MAX_RANDOM_INDEX = isDefault ? 50 : 12
    const randomDraw = isDefault ? input.first || 5 : 5

    const authorPool = await userService.recommendAuthors({
      take: MAX_RANDOM_INDEX * randomDraw,
      notIn,
      oss,
      type,
    })

    const chunks = chunk(authorPool, randomDraw)
    const index = Math.min(filter.random, MAX_RANDOM_INDEX, chunks.length - 1)
    const filteredAuthors = chunks[index] || []

    return connectionFromArray(filteredAuthors as any, input, authorPool.length)
  }

  const users = await userService.recommendAuthors({
    skip,
    take,
    notIn,
    type,
    count: true,
  })
  const totalCount = +users[0]?.totalCount || users.length

  return connectionFromPromisedArray(users as any, input, totalCount)
}
