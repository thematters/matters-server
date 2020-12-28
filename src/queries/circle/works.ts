import { ARTICLE_STATE, BATCH_SIZE } from 'common/enums'
import {
  connectionFromArray,
  connectionFromPromisedArray,
  cursorToIndex,
} from 'common/utils'
import { CircleToWorksResolver } from 'definitions'

const resolver: CircleToWorksResolver = async (
  { id },
  { input },
  { dataSources: { atomService }, knex }
) => {
  if (!id) {
    return connectionFromArray([], input)
  }

  const { first: take, after } = input
  const skip = cursorToIndex(after) + 1

  // base query
  const query = knex
    .select()
    .from('article_circle')
    .innerJoin('article', 'article.id', 'article_circle.article_id')
    .where({ circleId: id, 'article.state': ARTICLE_STATE.active })

  const countQuery = query.count().first()

  const articlesQuery = query
    .orderBy('article_circle.created_at', 'desc')
    .offset(skip)
    .limit(take || BATCH_SIZE)

  const [count, articles] = await Promise.all([countQuery, articlesQuery])
  const totalCount = parseInt(count ? (count.count as string) : '0', 10)

  return connectionFromPromisedArray(
    atomService.draftIdLoader.loadMany(articles.map(({ draftId }) => draftId)),
    input,
    totalCount
  )
}

export default resolver
