import type { GQLRecommendationResolvers, User } from '#definitions/index.js'

import { CACHE_PREFIX, CACHE_TTL } from '#common/enums/index.js'
import { ForbiddenError } from '#common/errors.js'
import {
  connectionFromArray,
  connectionFromPromisedArray,
  fromConnectionArgs,
  fromGlobalId,
} from '#common/utils/index.js'
import { CacheService } from '#connectors/index.js'
import chunk from 'lodash/chunk.js'

export const authors: GQLRecommendationResolvers['authors'] = async (
  { id },
  { input },
  {
    dataSources: {
      userService,
      recommendationService,
      atomService,
      connections: { objectCacheRedis },
    },
    viewer,
  }
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
    const cacheService = new CacheService(
      CACHE_PREFIX.RECOMMENDATION_AUTHORS,
      objectCacheRedis
    )
    let channelId = undefined
    if (input.filter?.channel?.id) {
      channelId = fromGlobalId(input.filter.channel.id).id
    } else if (input.filter?.channel?.shortHash) {
      const channel = await atomService.findUnique({
        table: 'topic_channel',
        where: { shortHash: input.filter.channel.shortHash },
      })
      channelId = channel?.id
    }

    const authorIds = await cacheService.getObject({
      keys: {
        type: 'recommendationAuthors',
        args: {
          viewerId: viewer.id,
          channelId,
          take: _take,
        },
      },
      getter: async () => {
        const { query } = await recommendationService.recommendAuthors(
          channelId
        )
        return query.whereNotIn('author_id', notIn).limit(_take)
      },
      expire: CACHE_TTL.MEDIUM,
    })
    const chunks = chunk(authorIds, draw)
    const index = Math.min(filter?.random || 0, limit, chunks.length - 1)
    const randomAuthorIds = chunks[index] || []
    const randomAuthors = await atomService.userIdLoader.loadMany(
      randomAuthorIds.map(({ authorId }) => authorId)
    )
    return connectionFromArray(randomAuthors, input, randomAuthors.length)
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
