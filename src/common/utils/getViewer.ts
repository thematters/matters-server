import jwt from 'jsonwebtoken'
import requestIp from 'request-ip'
import _ from 'lodash'

import { USER_ROLE } from 'common/enums'
import { UserService } from 'connectors'
import { environment } from 'common/environment'
import logger from 'common/logger'
import { Viewer } from 'definitions'
import { TokenInvalidError } from 'common/errors'

import { getLanguage } from './getLanguage'

export const roleAccess = [USER_ROLE.visitor, USER_ROLE.user, USER_ROLE.admin]

export const getViewerFromReq = async (
  req: requestIp.Request
): Promise<Viewer> => {
  const ip = requestIp.getClientIp(req)

  const { headers } = req

  const language = getLanguage((headers['accept-language'] ||
    headers['Accept-Language'] ||
    '') as string)

  let viewer: Viewer = {
    id: null,
    language,
    ip,
    role: USER_ROLE.visitor,
    hasRole: () => false
  }

  // get user from token
  const token = (headers['x-access-token'] || '') as string
  if (!token) {
    logger.info('User is not logged in, viewing as guest')
  } else {
    try {
      const userService = new UserService()
      const decoded = jwt.verify(token, environment.jwtSecret) as {
        uuid: string
      }
      const user = await userService.baseFindByUUID(decoded.uuid)

      // overwrite user setting by request
      if (language) {
        user.language = language
      }

      viewer = { ...viewer, ...user }
    } catch (err) {
      logger.info('token invalid')
      throw new TokenInvalidError('token invalid')
    }
  }

  // append hepler functions
  viewer.hasRole = (requires: string) =>
    roleAccess.findIndex(role => role === viewer.role) >=
    roleAccess.findIndex(role => role === requires)

  return viewer
}
