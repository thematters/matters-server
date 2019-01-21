import { connectionFromPromisedArray, cursorToIndex } from 'common/utils'

import { OSSToReportsResolver } from 'definitions'

export const reports: OSSToReportsResolver = async (
  root,
  { input: { comment, article, ...connectionArgs } },
  { viewer, dataSources: { systemService } }
) => {
  if (!comment && !article) {
    throw new Error('comment or article must be true')
  }

  const { first, after } = connectionArgs
  const offset = cursorToIndex(after) + 1
  const totalCount = await systemService.countReports({ comment, article })

  return connectionFromPromisedArray(
    systemService.findReports({
      comment,
      article,
      offset,
      limit: first
    }),
    connectionArgs,
    totalCount
  )
}
