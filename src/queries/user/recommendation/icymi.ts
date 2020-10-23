import { connectionFromPromisedArray, cursorToIndex } from 'common/utils'
import { RecommendationToIcymiResolver } from 'definitions'

export const icymi: RecommendationToIcymiResolver = async (
  { id },
  { input },
  { dataSources: { articleService, draftService } }
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
  return connectionFromPromisedArray(
    draftService.dataloader.loadMany(
      articles.map((article) => article.draftId)
    ),
    input,
    totalCount
  )
}
