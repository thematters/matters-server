import type { GQLRecommendationResolvers } from '#definitions/index.js'
import type { Knex } from 'knex'

import {
  DEFAULT_TAKE_PER_PAGE,
  MATERIALIZED_VIEW,
  TRANSACTION_PURPOSE,
  TRANSACTION_STATE,
  CACHE_PREFIX,
  CACHE_TTL,
  RECOMMENDATION_HOTTEST_DAYS,
  RECOMMENDATION_HOTTEST_MAX_TAKE,
} from '#common/enums/index.js'
import { ForbiddenError } from '#common/errors.js'
import {
  connectionFromArray,
  connectionFromPromisedArray,
  excludeSpam,
  selectWithTotalCount,
  fromConnectionArgs,
} from '#common/utils/index.js'
import { Cache } from '#connectors/index.js'

export const hottest: GQLRecommendationResolvers['hottest'] = async (
  _,
  { input },
  {
    viewer,
    dataSources: {
      atomService,
      recommendationService,
      systemService,
      connections: { knexRO, objectCacheRedis },
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

  if (input.newAlgo) {
    const cache = new Cache(
      CACHE_PREFIX.RECOMMENDATION_HOTTEST,
      objectCacheRedis
    )
    const articleIds = await cache.getObject({
      keys: {
        type: 'recommendationHottest',
      },
      getter: async () => {
        const { query } = await recommendationService.findHottestArticles({
          days: RECOMMENDATION_HOTTEST_DAYS,
        })
        return await query.limit(RECOMMENDATION_HOTTEST_MAX_TAKE * 1.5)
      },
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

  const donatedArticles = knexRO('transaction').select('target_id').where({
    purpose: TRANSACTION_PURPOSE.donation,
    state: TRANSACTION_STATE.succeeded,
  })

  const spamThreshold = await systemService.getSpamThreshold()

  const MAX_ITEM_COUNT = DEFAULT_TAKE_PER_PAGE * 50
  const makeHottestQuery = () => {
    const query = knexRO
      .select('article.*')
      .modify(selectWithTotalCount)
      .from(
        knexRO
          .select('article.*')
          .from(MATERIALIZED_VIEW.article_hottest_materialized)
          .join('article', function () {
            this.using('id')
          })
          .orderByRaw('score desc nulls last')
          .limit(MAX_ITEM_COUNT)
          .as('article')
      )
      .leftJoin(
        'article_recommend_setting AS setting',
        'article.id',
        'setting.article_id'
      )
      .where((builder: Knex.QueryBuilder) => {
        if (!oss) {
          builder
            .whereRaw('in_hottest IS NOT false')
            .whereNotIn(
              'article.author_id',
              knexRO('user_restriction')
                .select('user_id')
                .where('type', 'articleHottest')
            )
            .whereIn('article.id', donatedArticles)
            .modify(excludeSpam, spamThreshold, 'article')
        }
      })
      .as('hottest')

    return query.offset(skip).limit(take)
  }

  const articles = await makeHottestQuery()
  const totalCount = articles.length === 0 ? 0 : +articles[0].totalCount

  return connectionFromPromisedArray(articles, input, totalCount)
}
