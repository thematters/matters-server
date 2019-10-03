import { RequestHeaders } from 'request-ip'

import { getViewerFromReq } from 'common/utils'
import {
  ArticleService,
  CommentService,
  DraftService,
  NotificationService,
  SystemService,
  TagService,
  UserService
} from 'connectors'

export const initSubscriptions = (): { onConnect: any } => ({
  onConnect: async (
    connectionParams: RequestHeaders,
    webSocket: any,
    context: any
  ) => {
    // `connectionParams` passed from client
    // https://www.apollographql.com/docs/react/advanced/subscriptions.html#authentication
    const viewer = await getViewerFromReq({
      req: {
        headers: { ...connectionParams, ...context.request.headers },
        connection: {}
      }
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
