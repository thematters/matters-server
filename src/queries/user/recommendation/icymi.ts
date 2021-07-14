import { ARTICLE_STATE, BATCH_SIZE } from 'common/enums'
import { connectionFromPromisedArray, cursorToIndex } from 'common/utils'
import { RecommendationToIcymiResolver } from 'definitions'

export const icymi: RecommendationToIcymiResolver = async (
  { id },
  { input },
  { dataSources: { draftService }, knex }
) => {
  const { first, after } = input
  const offset = cursorToIndex(after) + 1

  const [totalCountResult, articles] = await Promise.all([
    knex('article')
      .join('matters_choice as c', 'c.article_id', 'article.id')
      .where({ state: ARTICLE_STATE.active })
      .count()
      .first(),
    knex('article')
      .select('article.*', 'c.updated_at as chose_at')
      .join('matters_choice as c', 'c.article_id', 'article.id')
      .orderBy('chose_at', 'desc')
      .where({ state: ARTICLE_STATE.active })
      .offset(offset)
      .limit(first || BATCH_SIZE),
  ])

  const totalCount = parseInt(
    totalCountResult ? (totalCountResult.count as string) : '0',
    10
  )

  return connectionFromPromisedArray(
    draftService.dataloader.loadMany(
      articles.map((article) => article.draftId)
    ),
    input,
    totalCount
  )
}
