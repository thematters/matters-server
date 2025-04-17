import type { GQLRecommendationResolvers } from '#definitions/index.js'
import type { Knex } from 'knex'

import {
  DEFAULT_TAKE_PER_PAGE,
  MATERIALIZED_VIEW,
  TRANSACTION_PURPOSE,
  TRANSACTION_STATE,
} from '#common/enums/index.js'
import { ForbiddenError } from '#common/errors.js'
import {
  connectionFromPromisedArray,
  excludeSpam,
  selectWithTotalCount,
  fromConnectionArgs,
} from '#common/utils/index.js'

export const hottest: GQLRecommendationResolvers['hottest'] = async (
  _,
  { input },
  {
    viewer,
    dataSources: {
      systemService,
      connections: { knexRO },
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
