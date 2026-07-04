import type { ArticleService } from '#connectors/index.js'
import type { Redis } from 'ioredis'

import { NODE_TYPES } from '#common/enums/index.js'
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
