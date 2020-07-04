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
    dataSources: { articleService },
  } = context

  // falback to icymi for visitor
  if (!viewer.id) {
    return icymi({ id }, { input }, context, info)
  }

  const { first, after } = input
  const offset = cursorToIndex(after) + 1

  const totalCount = await articleService.countRecommendInterest({
    userId: viewer.id,
  })

  return connectionFromPromisedArray(
    articleService.recommendByInterest({
      offset,
      limit: first,
      userId: viewer.id,
    }),
    input,
    totalCount
  )
}
