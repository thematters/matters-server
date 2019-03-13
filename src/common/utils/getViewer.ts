import jwt from 'jsonwebtoken'
import requestIp from 'request-ip'
import _ from 'lodash'
import cookie from 'cookie'
import { Response } from 'express'

import { USER_ROLE, LANGUAGE } from 'common/enums'
import { UserService } from 'connectors'
import { environment } from 'common/environment'
import logger from 'common/logger'
import { Viewer, LANGUAGES } from 'definitions'
import { TokenInvalidError } from 'common/errors'

import { getLanguage } from './getLanguage'
import { clearCookie } from './cookie'

export const roleAccess = [USER_ROLE.visitor, USER_ROLE.user, USER_ROLE.admin]

export const getViewerFromUser = (user: any) => {
  // overwrite default by user
  let viewer = { role: USER_ROLE.visitor, ...user }

  // append hepler functions
  viewer.hasRole = (requires: string) =>
    roleAccess.findIndex(role => role === viewer.role) >=
    roleAccess.findIndex(role => role === requires)

  return viewer
}

export const getViewerFromReq = async ({
  req,
  res
}: {
  req: requestIp.Request
  res?: Response
}): Promise<Viewer> => {
  const { headers } = req
  const ip = requestIp.getClientIp(req)
  const isWeb = headers['x-client-name'] === 'web'
  const language = getLanguage((headers['accept-language'] ||
    headers['Accept-Language'] ||
    LANGUAGE.zh_hant) as string)

  // user infomation from request
  let user = {
    language,
    ip
  }

  // get user from token, use cookie first then 'x-access-token'
  const token =
    cookie.parse(headers.cookie || '')['token'] ||
    (headers['x-access-token'] || '')

  if (!token) {
    logger.info('User is not logged in, viewing as guest')
  } else {
    try {
      const userService = new UserService()
      const decoded = jwt.verify(token as string, environment.jwtSecret) as {
        uuid: string
      }
      const userDB = await userService.baseFindByUUID(decoded.uuid)

      // overwrite user setting by request
      if (isWeb) {
        user = { ...userDB, ip: user.ip }
      } else {
        user = { ...userDB, ...user }
      }
    } catch (err) {
      logger.info('token invalid')
      if (res) {
        clearCookie(res)
      }
      throw new TokenInvalidError('token invalid')
    }
  }

  return getViewerFromUser(user)
}
