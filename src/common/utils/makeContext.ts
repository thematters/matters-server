// external
import jwt from 'jsonwebtoken'
// internal
import logger from 'common/logger'
import { RequestContext } from 'definitions'
import { environment } from 'common/environment'
import { UserService } from 'connectors'

export const makeContext = async ({
  req,
  connection
}: {
  req: { headers?: { 'x-access-token'?: string } }
  connection?: any
}): Promise<RequestContext> => {
  if (connection) {
    return connection.context
  }

  let viewer = { id: null }
  try {
    const userService = new UserService()
    const token =
      req.headers && req.headers['x-access-token']
        ? req.headers['x-access-token']
        : ''
    const decoded = jwt.verify(token, environment.jwtSecret) as { uuid: string }
    viewer = await userService.baseFindByUUID(decoded.uuid)
  } catch (err) {
    logger.info('[Subscriptions] User is not logged in, viewing as guest')
  }

  return {
    viewer
  }
}
