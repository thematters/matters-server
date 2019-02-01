import { Request } from 'request-ip'

import { RequestContext } from 'definitions'
import { getViewerFromReq } from './getViewer'

export const makeContext = async ({
  req,
  connection
}: {
  req: Request
  connection?: any
}): Promise<RequestContext> => {
  if (connection) {
    return connection.context
  }

  const viewer = await getViewerFromReq(req)

  return {
    viewer
  }
}
