import type { ArticleService, AtomService } from '#connectors/index.js'
import type { Redis } from 'ioredis'

import { CACHE_PREFIX, NODE_TYPES } from '#common/enums/index.js'
import { Cache } from '#connectors/cache/index.js'
import { invalidateFQC } from '@matters/apollo-response-cache'

// purge cached public query responses of a user and their articles after a
// state change (freeze/unfreeze/ban/archive), so restricted content stops
// being served from the response cache for up to CACHE_TTL.PUBLIC_QUERY
export const invalidateUserContentCaches = async (
  userId: string,
  {
    articleService,
    redis,
  }: {
    articleService: ArticleService
    redis: Redis
  }
) => {
  await invalidateFQC({ node: { type: NODE_TYPES.User, id: userId }, redis })
  for (const article of await articleService.findByAuthor(userId)) {
    await invalidateFQC({
      node: { type: NODE_TYPES.Article, id: article.id },
      redis,
    })
  }
}

// the recommended-authors pool (值得追蹤) is cached outside FQC with
// CACHE_TTL.LONG, one key per channel plus a sitewide one; drop all of them
// after a state change so a frozen author leaves (or an unfrozen one
// re-enters) the pool without waiting out the TTL
export const invalidateRecommendationAuthorsCache = async ({
  atomService,
  objectCacheRedis,
}: {
  atomService: AtomService
  objectCacheRedis: Redis
}) => {
  const cache = new Cache(CACHE_PREFIX.RECOMMENDATION_AUTHORS, objectCacheRedis)
  const channels = await atomService.findMany({
    table: 'topic_channel',
    select: ['id'],
  })
  const channelIds: Array<string | undefined> = [
    undefined, // sitewide key
    ...channels.map(({ id }) => id),
  ]
  for (const channelId of channelIds) {
    await cache.removeObject({
      keys: { type: 'recommendationAuthors', args: { channelId } },
    })
  }
}
