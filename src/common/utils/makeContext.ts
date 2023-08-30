import { Request, Response } from 'express'

import { getViewerFromReq } from 'common/utils'
import { knex } from 'connectors'
import {
  ArticleService,
  AtomService,
  CommentService,
  DraftService,
  NotificationService,
  OAuthService,
  OpenSeaService,
  PaymentService,
  SystemService,
  TagService,
  UserService,
  CollectionService,
} from 'connectors'
import { Context } from 'definitions'

export const makeContext = async ({
  req,
  res,
  connection,
}: {
  req: Request
  res: Response
  connection?: any
}): Promise<Context> => {
  if (connection) {
    return connection.context
  }

  const viewer = await getViewerFromReq({ req, res })

  // record user visiting timestamp
  if (viewer.id) {
    const userService = new UserService()
    userService.updateLastSeen(viewer.id)
  }

  return {
    viewer,
    req,
    res,
    knex,
    dataSources: {
      atomService: new AtomService(),
      userService: new UserService(),
      articleService: new ArticleService(),
      commentService: new CommentService(),
      draftService: new DraftService(),
      systemService: new SystemService(),
      tagService: new TagService(),
      notificationService: new NotificationService(),
      oauthService: new OAuthService(),
      paymentService: new PaymentService(),
      openseaService: new OpenSeaService(),
      collectionService: new CollectionService(),
    },
  }
}
