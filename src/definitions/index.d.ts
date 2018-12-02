import { GraphQLResolveInfo } from 'graphql'

import { ArticleService } from 'src/Article'
import { CommentService } from 'src/Comment'
import { UserService, ActionService } from 'src/connectors'

export type Resolver = (
  parent: any,
  args: any,
  context: Context,
  info: GraphQLResolveInfo
) => any

export interface ResolverMap {
  [key: string]: {
    [key: string]: Resolver
  }
}

export type Context = {
  articleService: InstanceType<typeof ArticleService>
  commentService: InstanceType<typeof CommentService>
  actionService: InstanceType<typeof ActionService>
  userService: InstanceType<typeof UserService>
}

export type ThirdPartyAccount = {
  accountName: 'facebook' | 'wechat' | 'google'
  baseUrl: string
  token: string
}
