import type { GQLRecommendationResolvers } from '#definitions/index.js'

import { ForbiddenError } from '#common/errors.js'
import { connectionFromQuery } from '#common/utils/index.js'

export const newest: GQLRecommendationResolvers['newest'] = async (
  _,
  { input },
  { viewer, dataSources: { articleService, systemService } }
) => {
  const { oss = false, excludeChannelArticles = false } = input

  if (oss) {
    if (!viewer.hasRole('admin')) {
      throw new ForbiddenError('only admin can access oss')
    }
  }
  const spamThreshold = await systemService.getSpamThreshold()

  const query = articleService.latestArticles({
    spamThreshold: spamThreshold ?? undefined,
    excludeChannelArticles,
    excludeExclusiveCampaignArticles: excludeChannelArticles,
  })

  return connectionFromQuery({
    query,
    orderBy: { column: 'id', order: 'desc' },
    args: input,
    cursorColumn: oss ? undefined : 'id',
  })
}
