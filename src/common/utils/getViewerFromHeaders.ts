import jwt from 'jsonwebtoken'

import { USER_ROLE } from 'common/enums'
import { UserService } from 'connectors'
import { environment } from 'common/environment'
import logger from 'common/logger'
import { Viewer } from 'definitions'
import { TokenInvalidError } from 'common/errors'

export const roleAccess = [USER_ROLE.visitor, USER_ROLE.user, USER_ROLE.admin]

export const getViewerFromHeaders = async (headers: {
  'x-access-token'?: string
  'accept-language'?: string
  'x-real-ip'?: string
}): Promise<Viewer> => {
  const ip = headers['x-real-ip']
  let language = headers['accept-language'] || 'zh-hant' // TODO: add parser
  let viewer: Viewer = {
    id: null,
    language,
    ip,
    role: USER_ROLE.visitor,
    hasRole: () => false
  }
  const token = headers['x-access-token'] || ''

  viewer.hasRole = (requires: string) =>
    roleAccess.findIndex(role => role === viewer.role) >=
    roleAccess.findIndex(role => role === requires)

  if (!token) {
    logger.info('User is not logged in, viewing as guest')
    return viewer
  }

  try {
    const userService = new UserService()
    const decoded = jwt.verify(token, environment.jwtSecret) as {
      uuid: string
    }
    const user = await userService.baseFindByUUID(decoded.uuid)
    viewer = { ...viewer, ...user } // TODO: get language if no language
    return viewer
  } catch (err) {
    logger.info('token invalid')
    throw new TokenInvalidError('token invalid')
  }
}
