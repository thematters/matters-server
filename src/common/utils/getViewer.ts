import jwt from 'jsonwebtoken'
import requestIp from 'request-ip'
import _ from 'lodash'
import cookie from 'cookie'
import { Response } from 'express'

import { USER_ROLE, LANGUAGE, USER_STATE } from 'common/enums'
import { UserService, NotificationService } from 'connectors'
import { environment } from 'common/environment'
import logger from 'common/logger'
import { Viewer } from 'definitions'

import { getLanguage } from './getLanguage'
import { clearCookie } from './cookie'

const userService = new UserService()

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

  return getViewerFromUser(user)
}
