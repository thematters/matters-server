import { connectionFromPromisedArray, cursorToIndex } from 'common/utils'
import { RecommendationToValuedResolver } from 'definitions'

import { icymi } from './icymi'

export const interest: RecommendationToValuedResolver = async (
  { id },
  { input },
  context,
  info
) => {
  const {
    viewer,
    dataSources: { articleService, draftService },
  } = context

  // falback to icymi for visitor
  if (!viewer.id) {
    return icymi({ id }, { input }, context, info)
  }

  const { first, after } = input
  const offset = cursorToIndex(after) + 1

  const [totalCount, articles] = await Promise.all([
    articleService.countRecommendInterest({ userId: viewer.id }),
    articleService.recommendByInterest({
      offset,
      limit: first,
      userId: viewer.id,
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
