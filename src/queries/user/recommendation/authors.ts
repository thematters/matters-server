import { CacheScope } from 'apollo-cache-control'
import { sampleSize } from 'lodash'

import { CACHE_TTL } from 'common/enums'
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
  { dataSources: { userService }, viewer },
  { cacheControl }
) => {
  const { oss = false } = input

  if (oss) {
    if (!viewer.hasRole('admin')) {
      throw new ForbiddenError('only admin can access oss')
    }
  }

  const { first, after, filter } = input

  const randomDraw = first || 5

  let notIn: any[] = id ? [id] : []
  if (filter && filter.followed === false) {
    // TODO: move this logic to db layer
    if (id) {
      const followees = await userService.findFollowees({
        userId: id,
        limit: 999,
      })
      notIn = [...notIn, ...followees.map(({ targetId }: any) => targetId)]
    }
  }

  if (filter && filter.random) {
    cacheControl.setCacheHint({
      maxAge: CACHE_TTL.INSTANT,
      scope: CacheScope.Private,
    })
    const authorPool = await userService.recommendAuthor({
      limit: 50,
      notIn,
      oss,
    })

    return connectionFromArray(sampleSize(authorPool, randomDraw), input)
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
