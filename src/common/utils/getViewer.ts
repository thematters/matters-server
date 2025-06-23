import type { Viewer, Connections, LANGUAGES } from '#definitions/index.js'

import {
  AUTH_MODE,
  COOKIE_ACCESS_TOKEN_NAME,
  COOKIE_USER_GROUP,
  COOKIE_LANGUAGE,
  USER_ROLE,
  USER_STATE,
  COOKIE_REFRESH_TOKEN_NAME,
  REFRESH_TOKEN_REVOKE_REASON,
} from '#common/enums/index.js'
import { environment } from '#common/environment.js'
import { ForbiddenByStateError, TokenInvalidError } from '#common/errors.js'
import { getLogger } from '#common/logger.js'
import { getLanguage } from '#common/utils/index.js'
import {
  OAuthService,
  SystemService,
  AtomService,
  UserService,
} from '#connectors/index.js'
import cookie from 'cookie'
import { Request, Response } from 'express'
import jwt from 'jsonwebtoken'

const logger = getLogger('utils-auth')

export const roleAccess = [USER_ROLE.visitor, USER_ROLE.user, USER_ROLE.admin]
export const authModes = [
  AUTH_MODE.visitor,
  AUTH_MODE.oauth,
  AUTH_MODE.user,
  AUTH_MODE.admin,
]

const HEADER_ACCESS_TOKEN = 'x-access-token'
const HEADER_REFRESH_TOKEN = 'x-refresh-token'
const HEADER_USER_AGENT = 'user-agent'
const HEADER_USER_AGENT_HASH = 'x-user-agent-hash'
const HEADER_USER_GROUP = 'x-user-group'

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
  } catch {
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

  // append user group
  viewer.group = group ? group : getUserGroup(user)

  // append helper functions (keep it till we fully utilize scope)
  viewer.hasRole = (requires: string) =>
    roleAccess.findIndex((role) => role === viewer.role) >=
    roleAccess.findIndex((role) => role === requires)

  // append helper functions
  viewer.hasAuthMode = (requires: string) =>
    authModes.findIndex((mode) => mode === viewer.authMode) >=
    authModes.findIndex((mode) => mode === requires)

  return viewer
}

const getUser = async (
  accessToken: string,
  agentHash: string,
  connections: Connections
) => {
  const atomService = new AtomService(connections)
  const systemService = new SystemService(connections)

  try {
    // get user from access token
    const payload = jwt.verify(accessToken, environment.jwtSecret) as {
      id: string
      type: 'access' | 'refresh'
    }

    if (payload.type === 'refresh') {
      throw new TokenInvalidError('token invalid')
    }

    const user = await atomService.userIdLoader.load(payload.id)

    // log agent hash if user is archived
    if (user.state === USER_STATE.archived) {
      if (agentHash) {
        await systemService
          .saveAgentHash(agentHash, user.id)
          .catch((error) => logger.error(error))
      }
      throw new ForbiddenByStateError('user has been deleted')
    }

    return { ...user, authMode: user.role }
  } catch {
    // get user from OAuth token
    const oAuthService = new OAuthService(connections)
    const data = await oAuthService.getAccessToken(accessToken)

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

export const getViewerFromReq = async (
  {
    req,
    res,
  }: {
    req: Request
    res?: Response
  },
  connections: Connections
): Promise<Viewer> => {
  const headers = req ? req.headers : {}
  const cookies = req ? cookie.parse(headers.cookie || '') : {}

  const language =
    (cookies[COOKIE_LANGUAGE] as LANGUAGES) ||
    getLanguage(
      (headers['Accept-Language'] || headers['accept-language']) as LANGUAGES
    )
  const agentHash = headers[HEADER_USER_AGENT_HASH] as string
  const userGroup = headers[HEADER_USER_GROUP] as string
  const userAgent = headers[HEADER_USER_AGENT] as string

  // user information from request
  let user = {
    language,
    authMode: AUTH_MODE.visitor,
    scope: {},
    ip: req?.clientIp,
    userAgent,
    agentHash,
  }

  // get tokens from cookie or header
  const { accessToken } = getTokensFromReq(req)
  const group = userGroup || cookies[COOKIE_USER_GROUP] || ''

  if (!accessToken) {
    return getViewerFromUser(user, group)
  }

  try {
    const userDB = await getUser(accessToken, agentHash, connections)

    // overwrite request by user settings
    user = { ...user, ...userDB }
  } catch (err) {
    logger.warn(err)

    if (req && res) {
      const userService = new UserService(connections)
      await userService.logout({
        req,
        res,
        reason: REFRESH_TOKEN_REVOKE_REASON.tokenInvalid,
      })
    }

    throw err
  }

  return getViewerFromUser(user, group, accessToken)
}

export const getTokensFromReq = (req: Request) => {
  const headers = req ? req.headers : {}
  const cookies = req ? cookie.parse(headers.cookie || '') : {}

  // get tokens from cookie or header
  const accessToken = (cookies[COOKIE_ACCESS_TOKEN_NAME] ||
    headers[HEADER_ACCESS_TOKEN]) as string | undefined
  const refreshToken = (cookies[COOKIE_REFRESH_TOKEN_NAME] ||
    headers[HEADER_REFRESH_TOKEN]) as string | undefined

  return {
    accessToken,
    refreshToken,
  }
}
