import jwt from 'jsonwebtoken'

import { Context } from 'definitions'
import { environment } from 'common/environment'
import {
  ArticleService,
  CommentService,
  DraftService,
  SystemService,
  TagService,
  UserService,
  NotificationService
} from 'connectors'

export const initSubscriptions = (): { onConnect: any } => ({
  onConnect: async (connectionParams: {
    'x-access-token': string
  }): Promise<Context> => {
    const userService = new UserService()
    let viewer

    try {
      const token = connectionParams['x-access-token']
      const decoded = jwt.verify(token, environment.jwtSecret) as {
        uuid: string
      }
      viewer = await userService.baseFindByUUID(decoded.uuid)
    } catch (err) {
      console.log('[API] User is not logged in, viewing as guest')
    }

    return {
      viewer,
      dataSources: {
        userService,
        articleService: new ArticleService(),
        commentService: new CommentService(),
        draftService: new DraftService(),
        systemService: new SystemService(),
        tagService: new TagService(),
        notificationService: new NotificationService()
      }
    }
  }
})
