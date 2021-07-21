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
  const makeNewestQuery = () => {
    const query = knex
      .select('article_set.draft_id')
      .from(
        knex
          .select()
          .from('article')
          .orderBy('id', 'desc')
          .limit(MAX_ITEM_COUNT)
          .as('article_set')
      )
      .leftJoin(
        'article_recommend_setting as setting',
        'article_set.id',
        'setting.article_id'
      )
      .where({ state: ARTICLE_STATE.active })
      .as('newest')

    if (!oss) {
      query.andWhere(function () {
        this.where({ inNewest: true }).orWhereNull('in_newest')
      })
    }

    return query
  }

  const [countRecord, articles] = await Promise.all([
    knex.select().from(makeNewestQuery()).count().first(),
    makeNewestQuery()
      .orderBy('article_set.id', 'desc')
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
