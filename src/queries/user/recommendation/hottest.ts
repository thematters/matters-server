import { BATCH_SIZE, MATERIALIZED_VIEW } from 'common/enums'
import { ForbiddenError } from 'common/errors'
import { connectionFromPromisedArray, cursorToIndex } from 'common/utils'
import { RecommendationToHottestResolver } from 'definitions'

export const hottest: RecommendationToHottestResolver = async (
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
  const makeHottestQuery = () => {
    let qs = knex
      .select('article.draft_id')
      .from(
        knex
          .select()
          .from(MATERIALIZED_VIEW.article_hottest_materialized)
          .orderByRaw('score desc nulls last')
          .limit(MAX_ITEM_COUNT)
          .as('view')
      )
      .leftJoin('article', 'view.id', 'article.id')
      .leftJoin(
        'article_recommend_setting as setting',
        'view.id',
        'setting.article_id'
      )
      .as('hottest')

    if (!oss) {
      qs = qs.where({ inHottest: true }).orWhereNull('in_hottest')
    }

    return qs
  }

  const [countRecord, articles] = await Promise.all([
    knex.select().from(makeHottestQuery()).count().first(),
    makeHottestQuery()
      .orderByRaw('score desc nulls last')
      .orderBy([{ column: 'view.id', order: 'desc' }])
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
