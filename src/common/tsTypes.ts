import { ArticleService } from '../Article'
import { CommentService } from '../Comment'
import { ActionService, UserService } from '../User'

export type Context = {
  articleService: InstanceType<typeof ArticleService>
  commentService: InstanceType<typeof CommentService>
  actionService: InstanceType<typeof ActionService>
  userService: InstanceType<typeof UserService>
}
