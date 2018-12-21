// external
import jwt from 'jsonwebtoken'
// internal
import { Context } from 'definitions'
import { environment } from 'common/environment'
import {
  ArticleService,
  CommentService,
  DraftService,
  SystemService,
  TagService,
  UserService
} from 'connectors'

export const makeContext = async ({
  req,
  connection
}: {
  req: { headers: { 'x-access-token': string } }
  connection: any
}): Promise<Context> => {
  if (connection) {
    return connection.context
  }

  const userService = new UserService()

  let viewer
  try {
    const token =
      req.headers && req.headers['x-access-token']
        ? req.headers['x-access-token']
        : ''
    const decoded = jwt.verify(token, environment.jwtSecret) as { uuid: string }
    viewer = await userService.baseFindByUUID(decoded.uuid)
  } catch (err) {
    console.log('User is not logged in, viewing as guest')
  }
  return {
    viewer,
    userService,
    articleService: new ArticleService(),
    commentService: new CommentService(),
    draftService: new DraftService(),
    systemService: new SystemService(),
    tagService: new TagService()
  }
}
