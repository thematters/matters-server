import {
  ARTICLE_STATE,
  DEFAULT_TAKE_PER_PAGE,
  PUBLISH_STATE,
} from 'common/enums'
import { ForbiddenError } from 'common/errors'
import {
  // connectionFromArray,
  connectionFromPromisedArray,
  fromConnectionArgs,
} from 'common/utils'
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
  const baseQuery = knex
    .select('draft.*')
    .from(
      knex
        // .select('article.id', 'article.draft_id')
        .select('draft.*')
        .from('article')
        .join('draft', 'draft.article_id', 'article.id')
        .where({
          'article.state': ARTICLE_STATE.active,
          'draft.publish_state': PUBLISH_STATE.published,
        })
        // .whereIn('draft.publish_state', [PUBLISH_STATE.published])
        .orderBy('article.id', 'desc')
        .limit(MAX_ITEM_COUNT * 2)
        .as('draft')
    )
    .leftJoin(
      'article_recommend_setting as setting',
      // 'article_set.id',
      'draft.article_id',
      'setting.article_id'
    )
    .where(function () {
      if (!oss) {
        this.where({ inNewest: true }).orWhereNull('in_newest')
        // this.whereRaw('?? IS NOT false', ['in_newest'])
      }
    })
    .limit(MAX_ITEM_COUNT)
    .as('newest')

  /*
knex
    .select('draft.id')
    .from(
      knex
        .select('draft.id')
        .from('article')
        .join('draft', 'draft.article_id', 'article.id')
        .whereIn('draft.publish_state', [PUBLISH_STATE.published])
        .andWhere({ state: ARTICLE_STATE.active })
        .orderBy('id', 'desc')
        .limit(MAX_ITEM_COUNT * 2)
        .as('draft')
    )
    .leftJoin(
      'article_recommend_setting as setting',
      'draft.id',
      'setting.article_id'
    )
    .limit(MAX_ITEM_COUNT)
    .as('newest')
*/

  const [countRecord, drafts] = await Promise.all([
    knex.select().from(baseQuery.clone()).count().first(),
    baseQuery.orderBy('draft.id', 'desc').offset(skip).limit(take),
  ])

  // console.log(`send query:`, { query: baseQuery.toString() })

  const totalCount = parseInt(
    countRecord ? (countRecord.count as string) : '0',
    10
  )

  return connectionFromPromisedArray(
    // draftService.dataloader.loadMany(articles.map(({ draftId }) => draftId)),
    // draftService.dataloader.loadMany(drafts.map(({ id }) => id)),
    drafts,
    input,
    totalCount
  )
}
