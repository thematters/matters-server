import type { GQLRecommendationResolvers } from '#definitions/index.js'

import { CACHE_PREFIX, CACHE_TTL } from '#common/enums/index.js'
import { ForbiddenError } from '#common/errors.js'
import {
  connectionFromArray,
  fromGlobalId,
  circleChunk,
} from '#common/utils/index.js'
import { Cache } from '#connectors/index.js'

export const tags: GQLRecommendationResolvers['tags'] = async (
  _,
  { input },
  {
    dataSources: {
      atomService,
      recommendationService,
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

  const draw = input.first || 5
  const limit = 50

  const cache = new Cache(CACHE_PREFIX.RECOMMENDATION_TAGS, objectCacheRedis)

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

  const tagIds = await cache.getObject({
    keys: {
      type: 'recommendationTags',
      args: { channelId: channelId },
    },
    getter: async () => {
      const { query } = await recommendationService.recommendTags(channelId)
      return query.limit(limit)
    },
    expire: CACHE_TTL.LONG,
  })
  const chunks = circleChunk(tagIds, draw)
  const index = Math.min(filter?.random || 0, limit, chunks.length - 1)
  const randomTagIds = chunks[index] || []
  const randomTags = await atomService.tagIdLoader.loadMany(
    randomTagIds.map(({ tagId }) => tagId)
  )
  return connectionFromArray(randomTags, input, tagIds.length)
}
