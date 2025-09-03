import type { GQLRecommendationResolvers } from '#definitions/index.js'

import { CACHE_PREFIX, CACHE_TTL } from '#common/enums/index.js'
import { ForbiddenError } from '#common/errors.js'
import {
  connectionFromArray,
  fromGlobalId,
  circleChunk,
} from '#common/utils/index.js'
import { Cache } from '#connectors/index.js'

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

  const cache = new Cache(CACHE_PREFIX.RECOMMENDATION_AUTHORS, objectCacheRedis)
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

  const authorIds = await cache.getObject({
    keys: {
      type: 'recommendationAuthors',
      args: {
        channelId,
      },
    },
    getter: async () => {
      const { query } = await recommendationService.recommendAuthors(channelId)
      return query
    },
    expire: CACHE_TTL.LONG,
  })
  const filtered = authorIds.filter(({ authorId }) => !notIn.includes(authorId))
  const chunks = circleChunk(filtered, draw)
  const index = Math.min(filter?.random || 0, limit, chunks.length - 1)
  const randomAuthorIds = chunks[index] || []
  const randomAuthors = await atomService.userIdLoader.loadMany(
    randomAuthorIds.map(({ authorId }) => authorId)
  )
  return connectionFromArray(randomAuthors, input, authorIds.length)
}
