import jwt from 'jsonwebtoken'

import { USER_ROLE } from 'common/enums'
import { UserService } from 'connectors'
import { environment } from 'common/environment'
import logger from 'common/logger'

export const getViewerFromHeaders = async (headers: {
  'x-access-token'?: string
  'Accept-Language'?: string
  'x-real-ip'?: string
}) => {
  const ip = headers['x-real-ip']
  let language = headers['Accept-Language']
  let viewer = { id: null, language, ip, role: USER_ROLE.visitor }
  try {
    const userService = new UserService()
    const token = headers['x-access-token'] || ''
    const decoded = jwt.verify(token, environment.jwtSecret) as { uuid: string }
    const user = await userService.baseFindByUUID(decoded.uuid)
    viewer = { ...viewer, ...user }
  } catch (err) {
    logger.info('User is not logged in, viewing as guest')
  }

  return viewer
}
