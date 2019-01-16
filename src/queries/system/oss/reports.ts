import { connectionFromPromisedArray } from 'graphql-relay'

import { OSSToReportsResolver } from 'definitions'

export const reports: OSSToReportsResolver = async (
  root,
  { input: { comment, article, ...connectionArgs } },
  { viewer, dataSources: { systemService } }
) => {
  if (!comment && !article) {
    throw new Error('comment or article must be true')
  }

  return connectionFromPromisedArray(
    systemService.findReports({ comment, article }),
    connectionArgs
  )
}
