import { connectionFromPromisedArray, cursorToIndex } from 'common/utils'
import { OSSToTodayResolver } from 'definitions'

export const today: OSSToTodayResolver = async (
  root,
  { input },
  { viewer, dataSources: { articleService } }
) => {
  const { first, after } = input
  const offset = cursorToIndex(after) + 1
  const totalCount = await articleService.countRecommendToday()

  return connectionFromPromisedArray(
    articleService.recommendToday({
      offset,
      limit: first,
    }),
    input,
    totalCount
  )
}
