import { connectionFromArray, cursorToIndex } from 'common/utils'
import { RecommendationToIcymiResolver } from 'definitions'

export const icymi: RecommendationToIcymiResolver = async (
  { id },
  { input },
  { dataSources: { articleService } }
) => {
  const { first, after } = input
  const offset = cursorToIndex(after) + 1

  const [totalCount, articles] = await Promise.all([
    articleService.countRecommendIcymi(),
    articleService.recommendIcymi({
      offset,
      limit: first,
    }),
  ])
  const nodes = await articleService.linkedDraftLoader.loadMany(
    articles.map((article) => article.id)
  )
  return connectionFromArray(nodes, input, totalCount)
}
