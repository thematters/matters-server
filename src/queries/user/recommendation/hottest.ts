import type { GQLRecommendationResolvers } from '#definitions/index.js'

import {
  CACHE_PREFIX,
  CACHE_TTL,
  RECOMMENDATION_HOTTEST_MAX_TAKE,
} from '#common/enums/index.js'
import { environment } from '#common/environment.js'
import { ForbiddenError } from '#common/errors.js'
import { connectionFromArray, fromConnectionArgs } from '#common/utils/index.js'
import { Cache } from '#connectors/index.js'

export const hottest: GQLRecommendationResolvers['hottest'] = async (
  _,
  { input },
  {
    viewer,
    dataSources: {
      atomService,
      recommendationService,
      connections: { objectCacheRedis },
    },
  }
) => {
  const { oss = false } = input

  if (oss) {
    if (!viewer.hasRole('admin')) {
      throw new ForbiddenError('only admin can access oss')
    }
  }
  const { take, skip } = fromConnectionArgs(input)

  const cache = new Cache(CACHE_PREFIX.RECOMMENDATION_HOTTEST, objectCacheRedis)
  const articleIds = await cache.getObject({
    keys: input.newAlgo
      ? {
          type: 'recommendationHottest',
          args: { normalizationVersion: 'v5' },
        }
      : {
          type: 'recommendationHottest',
        },
    getter: async () =>
      await recommendationService.findHottestArticles({
        days: environment.hottestArticlesDays,
        decayDays: environment.hottestArticlesDecayDays,
        HKDThreshold: environment.hottestArticlesHKDThreshold,
        USDTThreshold: environment.hottestArticlesUSDTThreshold,
        readWeight: environment.hottestArticlesReadWeight,
        commentWeight: environment.hottestArticlesCommentWeight,
        donationWeight: environment.hottestArticlesDonationWeight,
        readersThreshold: environment.hottestArticlesReadersThreshold,
        commentsThreshold: environment.hottestArticlesCommentsThreshold,
        normalizationVersion: input.newAlgo ? 'v5' : 'v4',
      }),
    expire: CACHE_TTL.LONG,
  })
  // TODO: add created_at to table and use it as filter here
  const restricted = await atomService.findMany({
    table: 'article_recommend_setting',
    where: {
      inHottest: false,
    },
  })
  const notIn = restricted.map(({ articleId }) => articleId)
  const filtered = articleIds
    .filter(({ articleId }) => !notIn.includes(articleId))
    .slice(0, RECOMMENDATION_HOTTEST_MAX_TAKE)
  const _articles = await atomService.articleIdLoader.loadMany(
    filtered.slice(skip, skip + take).map(({ articleId }) => articleId)
  )

  return connectionFromArray(
    _articles,
    input,
    Math.min(filtered.length, RECOMMENDATION_HOTTEST_MAX_TAKE)
  )
}
