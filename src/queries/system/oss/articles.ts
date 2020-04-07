import { isNil } from 'lodash'

import { connectionFromPromisedArray, cursorToIndex } from 'common/utils'
import { OSSToArticlesResolver } from 'definitions'

export const articles: OSSToArticlesResolver = async (
  root,
  { input: { public: isPublic, ...connectionArgs } },
  { viewer, dataSources: { articleService } }
) => {
  let where
  if (!isNil(isPublic)) {
    where = { public: isPublic }
  }

  const { first, after } = connectionArgs
  const offset = cursorToIndex(after) + 1
  const totalCount = await articleService.baseCount(where)

  return connectionFromPromisedArray(
    articleService.baseFind({
      where,
      offset,
      limit: first
    }),
    connectionArgs,
    totalCount
  )
}
