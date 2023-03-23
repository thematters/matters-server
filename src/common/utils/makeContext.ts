import * as Sentry from '@sentry/node'
import { Request, Response } from 'express'
import cloneDeep from 'lodash/cloneDeep.js'

import { NODE_TYPES } from 'common/enums/index.js'
import { getViewerFromReq, toGlobalId } from 'common/utils/index.js'
import { knex, UserService } from 'connectors/index.js'
import { RequestContext } from 'definitions'

const purgeSentryData = (req?: Request): any => {
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
  connection,
}: {
  req: Request
  res: Response
  connection?: any
}): Promise<RequestContext> => {
  // Add params for Sentry
  Sentry.configureScope((scope: any) => {
    const headers = req ? req.headers : {}
    scope.setTag('action-id', headers['x-sentry-action-id'])
    scope.setTag('source', 'server')
    scope.setExtra('parameters', purgeSentryData(req))
  })

  if (connection) {
    return connection.context
  }

  const viewer = await getViewerFromReq({ req, res })

  // record user visiting timestamp
  if (viewer.id) {
    const userService = new UserService()
    userService.updateLastSeen(viewer.id)
  }

  // Add user info for Sentry
  Sentry.configureScope((scope: any) => {
    scope.setUser({
      id: viewer.id
        ? toGlobalId({ type: NODE_TYPES.User, id: viewer.id })
        : viewer.id,
      role: viewer.role,
      language: viewer.language,
    })
  })

  return {
    viewer,
    req,
    res,
    knex,
  }
}
