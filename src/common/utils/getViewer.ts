import cookie from 'cookie'
import { Response } from 'express'
import jwt from 'jsonwebtoken'
import _ from 'lodash'
import requestIp from 'request-ip'

import { LANGUAGE, SCOPE_MODE, USER_ROLE, USER_STATE } from 'common/enums'
import { environment } from 'common/environment'
import logger from 'common/logger'
import { clearCookie, getLanguage, makeScope } from 'common/utils'
import { OAuthService, SystemService, UserService } from 'connectors'
import { Viewer } from 'definitions'

export const roleAccess = [USER_ROLE.visitor, USER_ROLE.user, USER_ROLE.admin]
export const scopeModes = [
  SCOPE_MODE.visitor,
  SCOPE_MODE.oauth,
  SCOPE_MODE.user,
  SCOPE_MODE.admin,
]

/**
 * Define user group by id or ip. Even is group A, and odd is group B.
 *
 */
export const getUserGroup = ({ id, ip }: { id?: string; ip?: string }) => {
  let num = 0
  try {
    if (id) {
      num = parseInt(id, 10) || 0
    } else if (ip) {
      const last = ip.split(/[.:]/).pop() || '0'
      num = parseInt(last, 10) || 0
    }
  } catch (error) {
    logger.error(error)
  }
  return num % 2 === 0 ? 'a' : 'b'
}

export const getViewerFromUser = async (user: any) => {
  // overwrite default by user
  const viewer = { role: USER_ROLE.visitor, ...user }

  // apppend uesr group
  viewer.group = getUserGroup(user)

  // append hepler functions (keep it till we fully utilize scope)
  viewer.hasRole = (requires: string) =>
    roleAccess.findIndex((role) => role === viewer.role) >=
    roleAccess.findIndex((role) => role === requires)

  // append helper functions
  viewer.hasScopeMode = (requires: string) =>
    scopeModes.findIndex((mode) => mode === viewer.scopeMode) >=
    scopeModes.findIndex((mode) => mode === requires)

  return viewer
}

const getUser = async (token: string, agentHash: string) => {
  const userService = new UserService()
  const systemService = new SystemService()

  try {
    // get general user
    const source = jwt.verify(token, environment.jwtSecret) as { uuid: string }
    const user = await userService.baseFindByUUID(source.uuid)

    if (user.state === USER_STATE.archived) {
      if (agentHash) {
        await systemService
          .saveAgentHash(agentHash, user.email)
          .catch((error) => logger.error)
      }
      throw new Error('user has deleted')
    }

    return { ...user, scopeMode: user.role }
  } catch (error) {
    // get oauth user
    const oAuthService = new OAuthService()
    const data = await oAuthService.getAccessToken(token)

    if (data && data.accessTokenExpiresAt) {
      // check it's expired or not
      const live = data.accessTokenExpiresAt.getTime() - Date.now() > 0

      if (!live) {
        throw new Error('token expired')
      }

      if (data.user.state === USER_STATE.archived) {
        throw new Error('user has been deleted')
      }

      const scope = makeScope(data.scope as string[])

      return {
        ...data.user,
        scopeMode: SCOPE_MODE.oauth,
        scope,
        oauthClient: data.client && data.client.rawClient,
      }
    }

    throw new Error('token invalid')
  }
}

export const getViewerFromReq = async ({
  req,
  res,
}: {
  req?: requestIp.Request & { clientIp?: string }
  res?: Response
}): Promise<Viewer> => {
  const headers = req ? req.headers : {}
  const isWeb = headers['x-client-name'] === 'web'
  const language = getLanguage(LANGUAGE.zh_hant as string)
  const agentHash = headers['x-user-agent-hash'] as string

  // user infomation from request
  let user = {
    ip: req && req.clientIp,
    language,
    scopeMode: SCOPE_MODE.visitor,
    scope: {},
    agentHash,
  }

  // get user from token, use cookie first then 'x-access-token'
  let token =
    cookie.parse(headers.cookie || '').token || headers['x-access-token'] || ''

  // FIXME: Strip off viewer for query that name contains `Public` suffix,
  // should be removed when the cookie-based token is deprecated
  // @ts-ignore
  const operationName = req?.query?.operationName || req?.body?.operationName
  const isPublicQuery = /Public$/.test(operationName)
  if (isPublicQuery) {
    token = ''
  }

  if (!token) {
    logger.info('User is not logged in, viewing as guest')
  } else {
    try {
      const userDB = await getUser(token as string, agentHash)

      // overwrite request by user settings
      user = { ...user, ...userDB }
    } catch (err) {
      logger.info(err)

      if (res) {
        clearCookie(res)
      }
    }
  }

  return getViewerFromUser(user)
}
