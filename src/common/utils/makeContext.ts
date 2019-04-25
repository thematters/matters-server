import * as Sentry from '@sentry/node'
import { Response, Request } from 'express'

import { RequestContext } from 'definitions'
import { getViewerFromReq } from './getViewer'

export const makeContext = async ({
  req,
  res,
  connection
}: {
  req: Request
  res: Response
  connection?: any
}): Promise<RequestContext> => {
  if (connection) {
    return connection.context
  }

  const viewer = await getViewerFromReq({ req, res })

  // Add info for Sentry
  Sentry.configureScope((scope: any) => {
    scope.setUser({
      id: viewer.id,
      role: viewer.role,
      language: viewer.language
    })
  })

  return {
    viewer,
    res
  }
}
