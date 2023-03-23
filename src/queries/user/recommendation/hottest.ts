import { DEFAULT_TAKE_PER_PAGE, MATERIALIZED_VIEW } from 'common/enums/index.js'
import { ForbiddenError } from 'common/errors.js'
import {
  connectionFromPromisedArray,
  fromConnectionArgs,
} from 'common/utils/index.js'
import { readonlyKnex as knexRO } from 'connectors/index.js'
import { RecommendationToHottestResolver } from 'definitions'

export const hottest: RecommendationToHottestResolver = async (
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
  const makeHottestQuery = () => {
    const query = knexRO
      .select('article.draft_id', knexRO.raw('count(1) OVER() AS total_count'))
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
        'article_recommend_setting as setting',
        'view.id',
        'setting.article_id'
      )
      .as('hottest')

    if (!oss) {
      query.where({ inHottest: true }).orWhereNull('in_hottest')
    }

    return query
      .orderByRaw('score desc nulls last')
      .orderBy([{ column: 'view.id', order: 'desc' }])
      .offset(skip)
      .limit(take)
  }

  const articles = await makeHottestQuery()

  const totalCount = articles.length === 0 ? 0 : +articles[0].totalCount

  return connectionFromPromisedArray(
    draftService.dataloader.loadMany(articles.map(({ draftId }) => draftId)),
    input,
    totalCount
  )
}
