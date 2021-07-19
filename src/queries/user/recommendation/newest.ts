import { ARTICLE_STATE, BATCH_SIZE } from 'common/enums'
import { ForbiddenError } from 'common/errors'
import { connectionFromPromisedArray, cursorToIndex } from 'common/utils'
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

  const { first, after } = input
  const offset = cursorToIndex(after) + 1

  const MAX_ITEM_COUNT = BATCH_SIZE * 50
  const makeNewestQuery = () => {
    let qs = knex
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
      qs = qs.andWhere(function () {
        this.where({ inNewest: true }).orWhereNull('in_newest')
      })
    }

    return qs
  }

  const [countRecord, articles] = await Promise.all([
    knex.select().from(makeNewestQuery()).count().first(),
    makeNewestQuery()
      .offset(offset)
      .limit(first || BATCH_SIZE),
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
