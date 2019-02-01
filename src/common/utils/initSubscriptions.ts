import { RequestHeaders } from 'request-ip'

import { Context } from 'definitions'
import {
  ArticleService,
  CommentService,
  DraftService,
  SystemService,
  TagService,
  UserService,
  NotificationService
} from 'connectors'
import { getViewerFromReq } from './getViewer'

export const initSubscriptions = (): { onConnect: any } => ({
  onConnect: async (
    connectionParams: RequestHeaders,
    webSocket: any,
    context: any
  ): Promise<Context> => {
    const viewer = await getViewerFromReq({
      headers: connectionParams,
      connection: {}
    })

    return {
      viewer,
      dataSources: {
        userService: new UserService(),
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
