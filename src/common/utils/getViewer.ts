import cookie from 'cookie'
import { Request, Response } from 'express'
import jwt from 'jsonwebtoken'

import {
  AUTH_MODE,
  COOKIE_TOKEN_NAME,
  COOKIE_USER_GROUP,
  USER_ROLE,
  USER_STATE,
} from 'common/enums'
import { environment } from 'common/environment'
import { ForbiddenByStateError, TokenInvalidError } from 'common/errors'
import { getLogger } from 'common/logger'
import { clearCookie, getLanguage } from 'common/utils'
import { OAuthService, SystemService, UserService } from 'connectors'
import { Viewer } from 'definitions'

const logger = getLogger('utils-auth')

export const roleAccess = [USER_ROLE.visitor, USER_ROLE.user, USER_ROLE.admin]
export const authModes = [
  AUTH_MODE.visitor,
  AUTH_MODE.oauth,
  AUTH_MODE.user,
  AUTH_MODE.admin,
]

/**
 * Define user group by id or ip. Even is group A, and odd is group B.
 *
 */
export const getUserGroup = ({
  id,
  ip,
}: {
  id?: string | null
  ip?: string
}) => {
  let num = 0
  try {
    if (id) {
      num = parseInt(id, 10) || 0
    } else if (ip) {
      const last = ip.split(/[.:]/).pop() || '0'
      num = parseInt(last, 10) || 0
    }
  } catch (error) {
    logger.warn('getUserGroup failed: %j', { id, ip })
  }
  return num % 2 === 0 ? 'a' : 'b'
}

export const getViewerFromUser = async (
  user: any,
  group?: string,
  token?: string
) => {
  // overwrite default by user
  const viewer = { role: USER_ROLE.visitor, ...user, token }

  // append uesr group
  viewer.group = group ? group : getUserGroup(user)

  // append hepler functions (keep it till we fully utilize scope)
  viewer.hasRole = (requires: string) =>
    roleAccess.findIndex((role) => role === viewer.role) >=
    roleAccess.findIndex((role) => role === requires)

  // append helper functions
  viewer.hasAuthMode = (requires: string) =>
    authModes.findIndex((mode) => mode === viewer.authMode) >=
    authModes.findIndex((mode) => mode === requires)

  return viewer
}

const getUser = async (token: string, agentHash: string) => {
  const userService = new UserService()
  const systemService = new SystemService()

  try {
    // get general user
    const source = jwt.verify(token, environment.jwtSecret) as {
      id: string
    }
    const user = await userService.dataloader.load(source.id)

    if (user.state === USER_STATE.archived) {
      if (agentHash) {
        await systemService
          .saveAgentHash(agentHash, user.id)
          .catch((error) => logger.error(error))
      }
      throw new ForbiddenByStateError('user has been deleted')
    }

    return { ...user, authMode: user.role }
  } catch (error) {
    // get oauth user
    const oAuthService = new OAuthService()
    const data = await oAuthService.getAccessToken(token)

    if (data && data.accessTokenExpiresAt) {
      // check it's expired or not
      const live = data.accessTokenExpiresAt.getTime() - Date.now() > 0

      if (!live) {
        throw new TokenInvalidError('oauth token expired')
      }

      if (data.user.state === USER_STATE.archived) {
        throw new ForbiddenByStateError('user has been deleted')
      }

      return {
        ...data.user,
        authMode: AUTH_MODE.oauth,
        scope: data.scope as string[],
        oauthClient: data.client && data.client.rawClient,
      }
    }

    throw new TokenInvalidError('token invalid')
  }
}

export const getViewerFromReq = async ({
  req,
  res,
}: {
  req?: Request
  res?: Response
}): Promise<Viewer> => {
  const headers = req ? req.headers : {}
  // const isWeb = headers['x-client-name'] === 'web'
  const language = getLanguage(
    (headers['Accept-Language'] || headers['accept-language']) as string
  )
  const agentHash = headers['x-user-agent-hash'] as string
  const userGroup = headers['x-user-group'] as string
  const userAgent = headers['user-agent'] as string

  // user infomation from request
  let user = {
    ip: req?.clientIp,
    userAgent,
    language,
    authMode: AUTH_MODE.visitor,
    scope: {},
    agentHash,
  }

  // get user from token, use cookie first then 'x-access-token'
  const token: string =
    cookie.parse(headers.cookie || '')[COOKIE_TOKEN_NAME] ||
    (headers['x-access-token'] as string) ||
    ''
  const group =
    userGroup || cookie.parse(headers.cookie || '')[COOKIE_USER_GROUP] || ''

  if (!token) {
    // logger.info('User is not logged in, viewing as guest')
    return getViewerFromUser(user, group)
  }

  try {
    const userDB = await getUser(token, agentHash)

    // overwrite request by user settings
    user = { ...user, ...userDB }
  } catch (err) {
    logger.warn(err)

    if (req && res) {
      clearCookie({ req, res })
    }

    throw err
  }

  return getViewerFromUser(user, group, token)
}
