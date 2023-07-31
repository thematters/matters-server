import type { GQLRecommendationResolvers } from 'definitions'

import { Knex } from 'knex'

import { ARTICLE_STATE, DEFAULT_TAKE_PER_PAGE } from 'common/enums'
import { ForbiddenError } from 'common/errors'
import { connectionFromPromisedArray, fromConnectionArgs } from 'common/utils'
import { readonlyKnex as knexRO } from 'connectors'

export const newest: GQLRecommendationResolvers['newest'] = async (
  _,
  { input },
  { viewer, dataSources: { draftService } }
) => {
  const { oss = false } = input

  if (oss) {
    if (!viewer.hasRole('admin')) {
      throw new ForbiddenError('only admin can access oss')
    }
  }

  const { take, skip } = fromConnectionArgs(input)

  const MAX_ITEM_COUNT = DEFAULT_TAKE_PER_PAGE * 50
  const query = knexRO
    .select('article_set.draft_id', 'article_set.id')
    .from(
      knexRO
        .select('id', 'draft_id', 'author_id')
        .from('article')
        .where({ state: ARTICLE_STATE.active })
        .orderBy('id', 'desc')
        .limit(MAX_ITEM_COUNT + 100) // add some extra to cover excluded ones in settings
        .as('article_set')
    )
    .leftJoin(
      'article_recommend_setting as setting',
      'article_set.id',
      'setting.article_id'
    )
    .where((builder: Knex.QueryBuilder) => {
      if (!oss) {
        builder
          .whereRaw('in_newest IS NOT false')
          .whereNotIn(
            'article_set.author_id',
            knexRO('user_restriction')
              .select('user_id')
              .where('type', 'articleNewest')
          )
      }
    })
    .as('newest')

  const [_countRecord, articles] = await Promise.all([
    MAX_ITEM_COUNT, // always 500
    knexRO
      .select()
      .from(query.orderBy('id', 'desc').limit(MAX_ITEM_COUNT))
      .orderBy('id', 'desc')
      .offset(skip)
      .limit(take),
  ])

  return connectionFromPromisedArray(
    draftService.loadByIds(articles.map(({ draftId }) => draftId)),
    input,
    MAX_ITEM_COUNT // totalCount
  )
}
