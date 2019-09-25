import { RequestHeaders } from 'request-ip'

import { Context } from 'definitions'
import {
  articleService,
  commentService,
  draftService,
  systemService,
  tagService,
  userService,
  notificationService
} from 'connectors'
import { getViewerFromReq } from './getViewer'

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
        userService,
        articleService,
        commentService,
        draftService,
        systemService,
        tagService,
        notificationService
      }
    }
  }
})
