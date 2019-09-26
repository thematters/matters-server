import jwt from 'jsonwebtoken'
import requestIp from 'request-ip'
import _ from 'lodash'
import cookie from 'cookie'
import { Response } from 'express'

import { USER_ROLE, LANGUAGE, SCOPE_MODE } from 'common/enums'
import { UserService, OAuthService } from 'connectors'
import { environment } from 'common/environment'
import logger from 'common/logger'
import { Viewer } from 'definitions'

import { getLanguage } from './getLanguage'
import { clearCookie } from './cookie'
import { makeScope } from './scope'

export const roleAccess = [USER_ROLE.visitor, USER_ROLE.user, USER_ROLE.admin]
export const scopeModes = [
  SCOPE_MODE.visitor,
  SCOPE_MODE.oauth,
  SCOPE_MODE.user,
  SCOPE_MODE.admin
]

export const getViewerFromUser = async (user: any) => {
  // overwrite default by user
  let viewer = { role: USER_ROLE.visitor, ...user }

  // append hepler functions (keep it till we fully utilize scope)
  viewer.hasRole = (requires: string) =>
    roleAccess.findIndex(role => role === viewer.role) >=
    roleAccess.findIndex(role => role === requires)

  // append helper functions
  viewer.hasScopeMode = (requires: string) =>
    scopeModes.findIndex(mode => mode === viewer.scopeMode) >=
    scopeModes.findIndex(mode => mode === requires)

  return viewer
}

const getUser = async (token: string) => {
  const userService = new UserService()

  try {
    // get general user
    const source = jwt.verify(token, environment.jwtSecret) as { uuid: string }
    const user = await userService.baseFindByUUID(source.uuid)
    return { ...user, scopeMode: user.role }
  } catch (error) {
    // get oauth user
    const oAuthService = new OAuthService()
    const data = await oAuthService.getAccessToken(token)
    if (data && data.accessTokenExpiresAt) {
      // check it's expired or not
      const live = data.accessTokenExpiresAt.getTime() - Date.now()
      if (live > 0) {
        const scope = makeScope(data.scope as string[])
        return {
          ...data.user,
          scopeMode: SCOPE_MODE.oauth,
          scope,
          oauthClient: data.client && data.client.rawClient
        }
      }
    }
    throw new Error('token invalid')
  }
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
  const language = getLanguage(LANGUAGE.zh_hant as string)

  // user infomation from request
  let user = {
    language,
    scopeMode: SCOPE_MODE.visitor,
    scope: {}
  }

  // get user from token, use cookie first then 'x-access-token'
  const token =
    cookie.parse(headers.cookie || '')['token'] ||
    (headers['x-access-token'] || '')

  if (!token) {
    logger.info('User is not logged in, viewing as guest')
  } else {
    try {
      const userDB = await getUser(token as string)
      // overwrite request by user settings
      user = { ...user, ...userDB }
    } catch (err) {
      logger.info('token invalid')
      if (res) {
        clearCookie(res)
      }
    }
  }

  return getViewerFromUser(user)
}
