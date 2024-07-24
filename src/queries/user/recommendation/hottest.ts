import type { GQLRecommendationResolvers } from 'definitions'

import { Knex } from 'knex'

import {
  DEFAULT_TAKE_PER_PAGE,
  MATERIALIZED_VIEW,
  TRANSACTION_PURPOSE,
  TRANSACTION_STATE,
} from 'common/enums'
import { ForbiddenError } from 'common/errors'
import { connectionFromPromisedArray, fromConnectionArgs } from 'common/utils'

export const hottest: GQLRecommendationResolvers['hottest'] = async (
  _,
  { input },
  {
    viewer,
    dataSources: {
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

  const donated_articles = knexRO('transaction').select('target_id').where({
    purpose: TRANSACTION_PURPOSE.donation,
    state: TRANSACTION_STATE.succeeded,
  })

  const MAX_ITEM_COUNT = DEFAULT_TAKE_PER_PAGE * 50
  const makeHottestQuery = () => {
    const query = knexRO
      .select('article.*', knexRO.raw('count(1) OVER() AS total_count'))
      .from(
        knexRO
          .select()
          .from(MATERIALIZED_VIEW.article_hottest_materialized)
          .orderByRaw('score desc nulls last')
          .limit(MAX_ITEM_COUNT)
          .as('view')
      )
      .leftJoin('article', 'view.id', 'article.id')
      .leftJoin(
        'article_recommend_setting AS setting',
        'view.id',
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
            .whereIn('article.id', donated_articles)
        }
      })
      .as('hottest')

    return query
      .orderByRaw('score DESC NULLS LAST')
      .orderBy([{ column: 'view.id', order: 'desc' }])
      .offset(skip)
      .limit(take)
  }

  const articles = await makeHottestQuery()

  const totalCount = articles.length === 0 ? 0 : +articles[0].totalCount

  return connectionFromPromisedArray(articles, input, totalCount)
}
