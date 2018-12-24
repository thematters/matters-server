import jwt from 'jsonwebtoken'

import { RequestContext } from 'definitions'
import { environment } from 'common/environment'
import { UserService } from 'connectors'

export const initSubscriptions = (): { onConnect: any } => ({
  onConnect: async (connectionParams: {
    'x-access-token': string
  }): Promise<RequestContext> => {
    let viewer
    try {
      const userService = new UserService()
      const token = connectionParams['x-access-token']
      const decoded = jwt.verify(token, environment.jwtSecret) as {
        uuid: string
      }
      viewer = await userService.baseFindByUUID(decoded.uuid)
    } catch (err) {
      console.log('[API] User is not logged in, viewing as guest')
    }

    return {
      viewer
    }
  }
})
