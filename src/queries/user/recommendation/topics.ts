import { ARTICLE_STATE } from 'common/enums'
import { ForbiddenError } from 'common/errors'
import { connectionFromPromisedArray, cursorToIndex } from 'common/utils'
import { RecommendationToTopicsResolver } from 'definitions'

export const topics: RecommendationToTopicsResolver = async (
  { id },
  { input },
  { dataSources: { articleService }, viewer }
) => {
  const { oss = false } = input

  if (oss) {
    if (!viewer.hasRole('admin')) {
      throw new ForbiddenError('only admin can access oss')
    }
  }

  const { first, after } = input
  const where = { 'article.state': ARTICLE_STATE.active }
  const offset = cursorToIndex(after) + 1
  const totalCount = await articleService.baseCount(where)
  const articles = await articleService.recommendTopics({
    offset,
    limit: first,
    where,
    oss,
  })
  return connectionFromPromisedArray(
    articleService.linkedDraftLoader.loadMany(
      articles.map((article) => article.id)
    ),
    input,
    totalCount
  )
}
