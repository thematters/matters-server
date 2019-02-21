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

  const viewer = await getViewerFromReq(req)

  return {
    viewer,
    res
  }
}
