import { RequestContext } from 'definitions'
import { getViewerFromHeaders } from './getViewerFromHeaders'

export const makeContext = async ({
  req,
  connection
}: {
  req: {
    headers?: {
      'x-access-token'?: string
      'Accept-Language'?: string
      'x-real-ip'?: string
    }
  }
  connection?: any
}): Promise<RequestContext> => {
  if (connection) {
    return connection.context
  }

  const headers = req.headers || {}

  const viewer = await getViewerFromHeaders(headers)

  return {
    viewer
  }
}
