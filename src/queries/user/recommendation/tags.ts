import type { GQLRecommendationResolvers } from '#definitions/index.js'

import { CACHE_PREFIX, CACHE_TTL } from '#common/enums/index.js'
import { ForbiddenError } from '#common/errors.js'
import {
  connectionFromArray,
  connectionFromPromisedArray,
  fromConnectionArgs,
  fromGlobalId,
  circleChunk,
} from '#common/utils/index.js'
import { CacheService } from '#connectors/index.js'

export const tags: GQLRecommendationResolvers['tags'] = async (
  _,
  { input },
  {
    dataSources: {
      tagService,
      atomService,
      recommendationService,
      connections: { objectCacheRedis },
    },
    viewer,
  }
) => {
  const { filter, oss = false } = input
  const { take, skip } = fromConnectionArgs(input, { defaultTake: 5 })

  if (oss) {
    if (!viewer.hasRole('admin')) {
      throw new ForbiddenError('only admin can access oss')
    }
  }

  const draw = input.first || 5
  const limit = 50

  /**
   * new algo
   */
  if (input.newAlgo) {
    const cacheService = new CacheService(
      CACHE_PREFIX.RECOMMENDATION_TAGS,
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

    const tagIds = await cacheService.getObject({
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

  /**
   * old algo
   */
  if (typeof filter?.random === 'number') {
    const { random } = filter

    const curationTags = await tagService.findTopTags({
      take: limit * draw,
      minAuthors: 5,
    })

    const chunks = circleChunk(curationTags, draw)
    const index = Math.min(random, limit, chunks.length - 1)
    const filteredTags = chunks[index] || []

    return connectionFromPromisedArray(
      atomService.tagIdLoader.loadMany(filteredTags.map((tag) => tag.id)),
      input,
      curationTags.length
    )
  }

  const totalCount = await tagService.countTopTags()
  const items = await tagService.findTopTags({
    skip,
    take,
  })

  return connectionFromPromisedArray(
    atomService.tagIdLoader.loadMany(items.map((item) => item.id)),
    input,
    totalCount
  )
}
