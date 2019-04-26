import * as Sentry from '@sentry/node'
import { Response, Request } from 'express'
import { cloneDeep } from 'lodash'

import { RequestContext } from 'definitions'
import { getViewerFromReq } from './getViewer'

const purgeSentryData = (req: Request): any => {
  const omit = (source: any, target: any) => {
    for (const key of Object.keys(source)) {
      if (key === target) {
        delete source[key]
      } else if (typeof source[key] === 'object' && source[key] != null) {
        omit(source[key], target)
      }
    }
  }

  if (req && req.body && typeof req.body.variables === 'object') {
    const params = cloneDeep(req.body.variables)
    omit(params, 'password')
    return params
  }
  return {}
}

export const makeContext = async ({
  req,
  res,
  connection
}: {
  req: Request
  res: Response
  connection?: any
}): Promise<RequestContext> => {
  // Add params for Sentry
  Sentry.configureScope((scope: any) => {
    scope.setExtra('parameters', purgeSentryData(req))
  })

  if (connection) {
    return connection.context
  }

  const viewer = await getViewerFromReq({ req, res })

  // Add user info for Sentry
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
