import { connectionFromPromisedArray, cursorToIndex } from 'common/utils'
import { OSSToArticlesResolver } from 'definitions'

export const articles: OSSToArticlesResolver = async (
  root,
  { input: { ...connectionArgs } },
  { viewer, dataSources: { articleService } }
) => {
  const { first, after } = connectionArgs
  const offset = cursorToIndex(after) + 1
  const totalCount = await articleService.baseCount()
  const items = await articleService.baseFind({
    offset,
    limit: first,
  })

  return connectionFromPromisedArray(
    articleService.linkedDraftLoader.loadMany(items.map((item) => item.id)),
    connectionArgs,
    totalCount
  )
}
