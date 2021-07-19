import { ARTICLE_STATE, DEFAULT_TAKE_PER_PAGE } from 'common/enums'
import { connectionFromPromisedArray, fromConnectionArgs } from 'common/utils'
import { RecommendationToIcymiResolver } from 'definitions'

export const icymi: RecommendationToIcymiResolver = async (
  { id },
  { input },
  { dataSources: { draftService }, knex }
) => {
  const { take, skip } = fromConnectionArgs(input)

  const MAX_ITEM_COUNT = DEFAULT_TAKE_PER_PAGE * 50
  const makeICYMIQuery = () =>
    knex
      .select('article.draft_id')
      .from(
        knex
          .select()
          .from('matters_choice')
          .orderBy('updated_at', 'desc')
          .limit(MAX_ITEM_COUNT)
          .as('choice')
      )
      .leftJoin('article', 'choice.article_id', 'article.id')
      .where({ state: ARTICLE_STATE.active })
      .as('icymi')

  const [countRecord, articles] = await Promise.all([
    knex.select().from(makeICYMIQuery()).count().first(),
    makeICYMIQuery().offset(skip).limit(take),
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
