import { connectionFromPromisedArray, cursorToIndex } from 'common/utils'
import { OSSToArticlesResolver } from 'definitions'

export const articles: OSSToArticlesResolver = async (
  root,
  { input: { ...connectionArgs } },
  { viewer, dataSources: { articleService, draftService } }
) => {
  const { first, after } = connectionArgs
  const offset = cursorToIndex(after) + 1
  const [totalCount, items] = await Promise.all([
    articleService.baseCount(),
    articleService.baseFind({ offset, limit: first }),
  ])
  return connectionFromPromisedArray(
    draftService.dataloader.loadMany(items.map((item) => item.draftId)),
    connectionArgs,
    totalCount
  )
}
