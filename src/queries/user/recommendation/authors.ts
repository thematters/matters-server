import type { GQLRecommendationResolvers } from '#definitions/index.js'

import { CACHE_PREFIX, CACHE_TTL, USER_STATE } from '#common/enums/index.js'
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

  const authorIds = await cache.getObject<Array<{ authorId: string }>>({
    keys: {
      type: 'recommendationAuthors',
      args: {
        channelId,
      },
    },
    // The recommendation pool is expensive to rebuild on public reads. Cache
    // misses are filled by the cache-ahead Lambda instead of tying up web DB
    // connections during deploys or cold starts.
    getter: async () => [],
    expire: CACHE_TTL.LONG,
  })
  const filtered = authorIds.filter(({ authorId }) => !notIn.includes(authorId))
  const chunks = circleChunk(filtered, draw)
  const index = Math.min(filter?.random || 0, limit, chunks.length - 1)
  const randomAuthorIds = chunks[index] || []
  const loadedAuthors = await atomService.userIdLoader.loadMany(
    randomAuthorIds.map(({ authorId }) => authorId)
  )
  // the cached pool may predate a freeze (CACHE_TTL.LONG), so author state
  // must be re-checked at read time
  const restrictedStates: string[] = [
    USER_STATE.frozen,
    USER_STATE.banned,
    USER_STATE.archived,
  ]
  const randomAuthors = loadedAuthors.filter(
    (author) =>
      author &&
      !(author instanceof Error) &&
      !restrictedStates.includes(author.state)
  )
  return connectionFromArray(randomAuthors, input, authorIds.length)
}
