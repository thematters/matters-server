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
import { getViewerFromHeaders } from './getViewerFromHeaders'

export const initSubscriptions = (): { onConnect: any } => ({
  onConnect: async (
    connectionParams: {
      'x-access-token'?: string
      'accept-language'?: string
      'x-real-ip'?: string
    },
    webSocket: any,
    context: any
  ): Promise<Context> => {
    const viewer = await getViewerFromHeaders(connectionParams)

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
