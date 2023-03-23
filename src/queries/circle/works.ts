import { ARTICLE_STATE } from 'common/enums/index.js'
import {
  connectionFromArray,
  connectionFromPromisedArray,
  fromConnectionArgs,
} from 'common/utils/index.js'
import { CircleToWorksResolver } from 'definitions'

const resolver: CircleToWorksResolver = async (
  { id },
  { input },
  { dataSources: { atomService }, knex }
) => {
  if (!id) {
    return connectionFromArray([], input)
  }

  const { take, skip } = fromConnectionArgs(input)

  const query = knex
    .from('article_circle')
    .innerJoin('article', 'article.id', 'article_circle.article_id')
    .where({ circleId: id, 'article.state': ARTICLE_STATE.active })

  const [count, articles] = await Promise.all([
    // countQuery,
    query.clone().count().first(),
    // articlesQuery,
    query.orderBy('article_circle.article_id', 'desc').offset(skip).limit(take),
  ])
  const totalCount = parseInt(count ? (count.count as string) : '0', 10)

  return connectionFromPromisedArray(
    atomService.draftIdLoader.loadMany(articles.map(({ draftId }) => draftId)),
    input,
    totalCount
  )
}

export default resolver
