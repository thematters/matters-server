import { Knex } from 'knex'

import { ARTICLE_STATE, DEFAULT_TAKE_PER_PAGE } from 'common/enums/index.js'
import { ForbiddenError } from 'common/errors.js'
import {
  connectionFromPromisedArray,
  fromConnectionArgs,
} from 'common/utils/index.js'
import { RecommendationToNewestResolver } from 'definitions'

export const newest: RecommendationToNewestResolver = async (
  _,
  { input },
  { viewer, dataSources: { draftService }, knex }
) => {
  const { oss = false } = input

  if (oss) {
    if (!viewer.hasRole('admin')) {
      throw new ForbiddenError('only admin can access oss')
    }
  }

  const { take, skip } = fromConnectionArgs(input)

  const MAX_ITEM_COUNT = DEFAULT_TAKE_PER_PAGE * 50
  const query = knex
    .select('article_set.draft_id', 'article_set.id')
    .from(
      knex
        .select('id', 'draft_id')
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
    .andWhere((builder: Knex.QueryBuilder) => {
      if (!oss) {
        // this.where({ inNewest: true }).orWhereNull('in_newest')
        builder.whereRaw('in_newest IS NOT false')
      }
    })
    .as('newest')

  const [_countRecord, articles] = await Promise.all([
    MAX_ITEM_COUNT, // always 500 // knex.select().from(query.clone().limit(MAX_ITEM_COUNT)).count().first(),
    knex
      .select()
      .from(query.orderBy('id', 'desc').limit(MAX_ITEM_COUNT))
      .orderBy('id', 'desc')
      .offset(skip)
      .limit(take),
  ])

  return connectionFromPromisedArray(
    draftService.dataloader.loadMany(articles.map(({ draftId }) => draftId)),
    input,
    MAX_ITEM_COUNT // totalCount
  )
}
