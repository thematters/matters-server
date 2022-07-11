import { ARTICLE_STATE, DEFAULT_TAKE_PER_PAGE } from 'common/enums'
import { ForbiddenError } from 'common/errors'
import { connectionFromPromisedArray, fromConnectionArgs } from 'common/utils'
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
        .select()
        .from('article')
        .orderBy('id', 'desc')
        .limit(MAX_ITEM_COUNT + 100) // add some extra to cover excluded ones
        .as('article_set')
    )
    .leftJoin(
      'article_recommend_setting as setting',
      'article_set.id',
      'setting.article_id'
    )
    .where({ state: ARTICLE_STATE.active })
    .andWhere(function () {
      if (!oss) {
        this.where({ inNewest: true }).orWhereNull('in_newest')
      }
    })
    .as('newest')

  const [countRecord, articles] = await Promise.all([
    knex.select().from(query.clone().limit(MAX_ITEM_COUNT)).count().first(),
    knex
      .select()
      .from(query.clone().limit(MAX_ITEM_COUNT))
      .orderBy('id', 'desc')
      .offset(skip)
      .limit(take),
  ])

  const totalCount = parseInt(
    countRecord ? (countRecord.count as string) : '0',
    10
  )

  return connectionFromPromisedArray(
    draftService.dataloader.loadMany(articles.map(({ draftId }) => draftId)),
    input,
    totalCount
  )
}
