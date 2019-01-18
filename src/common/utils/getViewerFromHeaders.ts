import jwt from 'jsonwebtoken'

import { USER_ROLE } from 'common/enums'
import { UserService } from 'connectors'
import { environment } from 'common/environment'
import logger from 'common/logger'
import { Viewer } from 'definitions'

const roleAccess = [USER_ROLE.visitor, USER_ROLE.user, USER_ROLE.admin]

export const getViewerFromHeaders = async (headers: {
  'x-access-token'?: string
  'Accept-Language'?: string
  'x-real-ip'?: string
}): Promise<Viewer> => {
  const ip = headers['x-real-ip']
  let language = headers['Accept-Language'] || 'zh-hant'
  let viewer: Viewer = {
    id: null,
    language,
    ip,
    role: USER_ROLE.visitor,
    hasRole: () => false
  }

  try {
    const userService = new UserService()
    const token = headers['x-access-token'] || ''
    const decoded = jwt.verify(token, environment.jwtSecret) as { uuid: string }
    const user = await userService.baseFindByUUID(decoded.uuid)
    viewer = { ...viewer, ...user } // TODO: get language if no language
  } catch (err) {
    logger.info('User is not logged in, viewing as guest')
  }

  viewer.hasRole = (requires: string) =>
    roleAccess.findIndex(role => role === viewer.role) >=
    roleAccess.findIndex(role => role === requires)

  return viewer
}
