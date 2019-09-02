import jwt from 'jsonwebtoken'
import requestIp from 'request-ip'
import _ from 'lodash'
import cookie from 'cookie'
import { Response } from 'express'

import { USER_ROLE, LANGUAGE, SCOPE_MODE, USER_STATE } from 'common/enums'
import { UserService, OAuthService } from 'connectors'
import { environment } from 'common/environment'
import logger from 'common/logger'
import { Viewer } from 'definitions'

import { getLanguage } from './getLanguage'
import { clearCookie } from './cookie'
import { makeScope } from './scope'

const userService = new UserService()
const oAuthService = new OAuthService()

export const roleAccess = [USER_ROLE.visitor, USER_ROLE.user, USER_ROLE.admin]
export const scopeModes = [
  SCOPE_MODE.visitor,
  SCOPE_MODE.user,
  SCOPE_MODE.admin,
  SCOPE_MODE.oauth
]

const getViewerScope = async (role: string, token: any) => {
  if (!token || (role !== USER_ROLE.user && role !== USER_ROLE.admin)) {
    return { scopeMode: SCOPE_MODE.visitor, scope: {} }
  }

  const oAuthToken = await oAuthService.getAccessToken(token as string)
  if (oAuthToken) {
    const scope = makeScope(oAuthToken.scope as string[], 'viewer')
    return { scopeMode: SCOPE_MODE.oauth, scope }
  }
  return { scopeMode: role, scope: {} }
}

export const getViewerFromUser = async (user: any, token: any) => {
  // overwrite default by user
  let viewer = { role: USER_ROLE.visitor, ...user }

  // append hepler functions
  viewer.hasRole = (requires: string) =>
    roleAccess.findIndex(role => role === viewer.role) >=
    roleAccess.findIndex(role => role === requires)

  // get viewer scope
  const scope = await getViewerScope(viewer.role, token)
  viewer = { ...viewer, ...scope }

  // append helper functions
  viewer.hasScopeMode = (requires: string) =>
    scopeModes.findIndex(mode => mode === viewer.scopeMode) >=
    scopeModes.findIndex(mode => mode === requires)

  return viewer
}

export const getViewerFromReq = async ({
  req,
  res
}: {
  req?: requestIp.Request
  res?: Response
}): Promise<Viewer> => {
  const headers = req ? req.headers : {}
  const isWeb = headers['x-client-name'] === 'web'
  const language = getLanguage((headers['accept-language'] ||
    headers['Accept-Language'] ||
    LANGUAGE.zh_hant) as string)

  // user infomation from request
  let user = {
    language
  }

  // get user from token, use cookie first then 'x-access-token'
  const token =
    cookie.parse(headers.cookie || '')['token'] ||
    (headers['x-access-token'] || '')

  if (!token) {
    logger.info('User is not logged in, viewing as guest')
  } else {
    try {
      const decoded = jwt.verify(token as string, environment.jwtSecret) as {
        uuid: string
      }
      let userDB = await userService.baseFindByUUID(decoded.uuid)

      // overwrite request by user settings
      user = { ...user, ...userDB }
    } catch (err) {
      logger.info('token invalid')
      if (res) {
        clearCookie(res)
      }
    }
  }

  return getViewerFromUser(user, token)
}
